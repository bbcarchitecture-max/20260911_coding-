import {
  User, Project, Column, Task, RFI, Attachment, Comment, RFIHistory,
  ApiLog, NotificationItem, Role
} from '../types';
import {
  INITIAL_USERS, INITIAL_PROJECT, INITIAL_COLUMNS,
  INITIAL_TASKS, INITIAL_RFIS, INITIAL_ATTACHMENTS,
  INITIAL_COMMENTS, INITIAL_RFI_HISTORIES
} from '../mockData';

const STORAGE_KEYS = {
  TASKS: 'pms_tasks_v1',
  RFIS: 'pms_rfis_v1',
  COLUMNS: 'pms_columns_v1',
  ATTACHMENTS: 'pms_attachments_v1',
  COMMENTS: 'pms_comments_v1',
  RFI_HISTORIES: 'pms_rfi_histories_v1',
  NOTIFICATIONS: 'pms_notifications_v1',
  CURRENT_USER_ID: 'pms_current_user_id_v1',
  API_LOGS: 'pms_api_logs_v1'
};

function getStored<T>(key: string, defaultVal: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Local storage write failed', e);
  }
}

// In-memory subscribers for real-time optimistic sync events
type ChangeListener = () => void;
const listeners: Set<ChangeListener> = new Set();

export const subscribeToChanges = (listener: ChangeListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifySubscribers = () => {
  listeners.forEach(fn => fn());
};

class ApiService {
  private users: User[] = INITIAL_USERS;
  private project: Project = INITIAL_PROJECT;

  // Logging API calls for SRS Architecture verification
  private logApiCall(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    endpoint: string,
    status: number,
    requestBody?: any,
    responseBody?: any,
    durationMs: number = Math.floor(Math.random() * 45) + 15
  ) {
    const logs = this.getApiLogs();
    const newLog: ApiLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      method,
      endpoint,
      status,
      durationMs,
      requestBody,
      responseBody
    };
    const updated = [newLog, ...logs.slice(0, 49)];
    setStored(STORAGE_KEYS.API_LOGS, updated);
    notifySubscribers();
  }

  public getApiLogs(): ApiLog[] {
    return getStored<ApiLog[]>(STORAGE_KEYS.API_LOGS, []);
  }

  public clearApiLogs(): void {
    setStored(STORAGE_KEYS.API_LOGS, []);
    notifySubscribers();
  }

  // --- Users & Project & RBAC ---
  public getUsers(): User[] {
    return this.users;
  }

  public getCurrentUser(): User {
    const storedId = getStored<string>(STORAGE_KEYS.CURRENT_USER_ID, 'usr-pm-1');
    const user = this.users.find(u => u.id === storedId);
    return user || this.users[1]; // Default to PM
  }

  public setCurrentUserId(userId: string): void {
    setStored(STORAGE_KEYS.CURRENT_USER_ID, userId);
    notifySubscribers();
  }

  public getProject(): Project {
    return this.project;
  }

  public checkPermission(role: Role, action: 'CREATE_TASK' | 'MOVE_TASK' | 'EDIT_TASK' | 'DELETE_TASK' | 'CREATE_RFI' | 'ANSWER_RFI' | 'CLOSE_RFI' | 'MANAGE_SETTINGS'): boolean {
    switch (role) {
      case 'SUPER_ADMIN':
        return true;
      case 'PM':
        return true;
      case 'MEMBER':
        return ['CREATE_TASK', 'MOVE_TASK', 'EDIT_TASK', 'CREATE_RFI'].includes(action);
      case 'GUEST_AUDITOR':
        return ['ANSWER_RFI'].includes(action);
      default:
        return false;
    }
  }

  // --- Columns & Boards ---
  public getColumns(): Column[] {
    return getStored<Column[]>(STORAGE_KEYS.COLUMNS, INITIAL_COLUMNS);
  }

  public saveColumns(cols: Column[]): void {
    setStored(STORAGE_KEYS.COLUMNS, cols);
    notifySubscribers();
  }

  // --- Tasks (Kanban) ---
  public getTasks(): Task[] {
    return getStored<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
  }

  public createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'position'>): Task {
    const tasks = this.getTasks();
    const colTasks = tasks.filter(t => t.columnId === data.columnId);
    const maxPos = colTasks.length > 0 ? Math.max(...colTasks.map(t => t.position)) : 0;
    const newPosition = maxPos + 1000;

    const newTask: Task = {
      ...data,
      id: 'task-' + Date.now(),
      position: newPosition,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [newTask, ...tasks];
    setStored(STORAGE_KEYS.TASKS, updated);

    this.logApiCall('POST', '/api/v1/tasks', 201, data, newTask);
    notifySubscribers();
    return newTask;
  }

  public updateTask(taskId: string, patch: Partial<Task>): Task {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error('Task not found');

    const updatedTask = {
      ...tasks[index],
      ...patch,
      updatedAt: new Date().toISOString()
    };

    tasks[index] = updatedTask;
    setStored(STORAGE_KEYS.TASKS, tasks);

    this.logApiCall('PATCH', `/api/v1/tasks/${taskId}`, 200, patch, updatedTask);
    notifySubscribers();
    return updatedTask;
  }

  public deleteTask(taskId: string): void {
    const tasks = this.getTasks().filter(t => t.id !== taskId);
    setStored(STORAGE_KEYS.TASKS, tasks);
    this.logApiCall('DELETE', `/api/v1/tasks/${taskId}`, 204, null, { success: true });
    notifySubscribers();
  }

  /**
   * Lexorank / Floating Point Rank Ordering
   * Formula specified in SRS 5.2: NewPosition = (PrevPosition + NextPosition) / 2
   */
  public moveTask(
    taskId: string,
    targetColumnId: string,
    targetIndex: number
  ): { task: Task; rebalanced: boolean } {
    const tasks = this.getTasks();
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) throw new Error('Task not found');

    // Get target column items sorted by position ascending (excluding the dragged item)
    const targetColumnTasks = tasks
      .filter(t => t.columnId === targetColumnId && t.id !== taskId)
      .sort((a, b) => a.position - b.position);

    let newPos: number;
    let rebalanced = false;

    if (targetColumnTasks.length === 0) {
      newPos = 1000;
    } else if (targetIndex <= 0) {
      // Placed before the first item
      const firstPos = targetColumnTasks[0].position;
      newPos = firstPos / 2;
      if (newPos < 0.001) {
        // Trigger auto rebalance
        rebalanced = true;
      }
    } else if (targetIndex >= targetColumnTasks.length) {
      // Placed after the last item
      const lastPos = targetColumnTasks[targetColumnTasks.length - 1].position;
      newPos = lastPos + 1000;
    } else {
      // Placed between prev and next
      const prevPos = targetColumnTasks[targetIndex - 1].position;
      const nextPos = targetColumnTasks[targetIndex].position;
      newPos = (prevPos + nextPos) / 2;

      // SRS 5.2: 當間距小於精度門檻時 (e.g. 0.001)，觸發後台重新平衡 (Rebalance)
      if (Math.abs(nextPos - prevPos) < 0.005) {
        rebalanced = true;
      }
    }

    currentTask.columnId = targetColumnId;
    currentTask.position = newPos;
    currentTask.updatedAt = new Date().toISOString();

    if (rebalanced) {
      // Rebalance target column positions evenly (1000, 2000, 3000...)
      const allInCol = [...targetColumnTasks];
      allInCol.splice(targetIndex, 0, currentTask);
      allInCol.forEach((t, idx) => {
        t.position = (idx + 1) * 1000;
      });
    }

    setStored(STORAGE_KEYS.TASKS, tasks);

    this.logApiCall(
      'PATCH',
      `/api/v1/tasks/${taskId}/move`,
      200,
      { targetColumnId, targetIndex, calculatedPosition: newPos, rebalanceTriggered: rebalanced },
      { id: taskId, columnId: targetColumnId, position: currentTask.position }
    );

    notifySubscribers();
    return { task: currentTask, rebalanced };
  }

  // --- RFI (Request for Information) ---
  public getRFIs(): RFI[] {
    return getStored<RFI[]>(STORAGE_KEYS.RFIS, INITIAL_RFIS);
  }

  public getRFIHistories(rfiId?: string): RFIHistory[] {
    const all = getStored<RFIHistory[]>(STORAGE_KEYS.RFI_HISTORIES, INITIAL_RFI_HISTORIES);
    if (!rfiId) return all;
    return all.filter(h => h.rfiId === rfiId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Generates formatted serial code: RFI-{PROJECT_CODE}-{YEAR}-{4DIGIT_SEQ}
   * e.g. RFI-BLD1-2026-0044
   */
  public generateNextRfiCode(): string {
    const rfis = this.getRFIs();
    const currentYear = new Date().getFullYear();
    const projCode = this.project.code || 'BLD1';
    
    // Extract highest sequence number
    let maxSeq = 43; // default starting anchor
    rfis.forEach(r => {
      const parts = r.rfiCode.split('-');
      if (parts.length === 4) {
        const seq = parseInt(parts[3], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });

    const nextSeq = maxSeq + 1;
    const padded = nextSeq.toString().padStart(4, '0');
    return `RFI-${projCode}-${currentYear}-${padded}`;
  }

  public createRFI(data: Omit<RFI, 'id' | 'rfiCode' | 'createdAt' | 'updatedAt' | 'clientSigned' | 'pmSigned'>): RFI {
    const rfis = this.getRFIs();
    const rfiCode = this.generateNextRfiCode();
    const newId = 'rfi-' + Date.now();

    const newRfi: RFI = {
      ...data,
      id: newId,
      rfiCode,
      clientSigned: false,
      pmSigned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add audit log
    const user = this.getCurrentUser();
    this.addRfiHistory({
      rfiId: newId,
      actorId: user.id,
      actorName: user.name,
      action: '提出新資訊請求單 (Create & Submit RFI)',
      fromStatus: 'DRAFT',
      toStatus: data.status,
      note: `主旨：${data.subject}。工期影響估計：${data.scheduleImpact} 天，追加成本：$${data.costAmount || 0} 元`,
      timestamp: new Date().toISOString()
    });

    const updated = [newRfi, ...rfis];
    setStored(STORAGE_KEYS.RFIS, updated);

    this.logApiCall('POST', '/api/v1/rfis', 201, data, newRfi);

    // Notify respondent
    if (data.assignedTo && data.assignedTo !== user.id) {
      this.createNotification({
        userId: data.assignedTo,
        title: `新的 RFI 待回覆：${rfiCode}`,
        message: `${user.name} 提出了工程疑問單「${data.subject}」，請於 ${data.dueDate} 前提供正式回覆。`,
        type: 'ASSIGN',
        linkId: newId,
        linkType: 'RFI'
      });
    }

    notifySubscribers();
    return newRfi;
  }

  public updateRFI(rfiId: string, patch: Partial<RFI>, note?: string): RFI {
    const rfis = this.getRFIs();
    const index = rfis.findIndex(r => r.id === rfiId);
    if (index === -1) throw new Error('RFI not found');

    const prev = rfis[index];
    const updated: RFI = {
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    rfis[index] = updated;
    setStored(STORAGE_KEYS.RFIS, rfis);

    const user = this.getCurrentUser();
    if (patch.status && patch.status !== prev.status) {
      this.addRfiHistory({
        rfiId,
        actorId: user.id,
        actorName: user.name,
        action: `狀態變更為 ${patch.status}`,
        fromStatus: prev.status,
        toStatus: patch.status,
        note: note || `由 ${user.name} 執行審查與狀態流轉`,
        timestamp: new Date().toISOString()
      });
    }

    this.logApiCall('PATCH', `/api/v1/rfis/${rfiId}/status`, 200, patch, updated);
    notifySubscribers();
    return updated;
  }

  public replyRFI(rfiId: string, officialResponse: string, signOff: boolean = true): RFI {
    const rfis = this.getRFIs();
    const index = rfis.findIndex(r => r.id === rfiId);
    if (index === -1) throw new Error('RFI not found');

    const user = this.getCurrentUser();
    const updated: RFI = {
      ...rfis[index],
      officialResponse,
      status: 'ANSWERED',
      pmSigned: user.role === 'PM' || user.role === 'SUPER_ADMIN' ? true : rfis[index].pmSigned,
      clientSigned: user.role === 'GUEST_AUDITOR' ? true : rfis[index].clientSigned,
      updatedAt: new Date().toISOString()
    };

    rfis[index] = updated;
    setStored(STORAGE_KEYS.RFIS, rfis);

    this.addRfiHistory({
      rfiId,
      actorId: user.id,
      actorName: user.name,
      action: '提送官方正式答覆與簽署 (Formal Response & Sign-off)',
      fromStatus: 'IN_REVIEW',
      toStatus: 'ANSWERED',
      note: officialResponse.substring(0, 100) + (officialResponse.length > 100 ? '...' : ''),
      timestamp: new Date().toISOString()
    });

    this.logApiCall('PATCH', `/api/v1/rfis/${rfiId}/reply`, 200, { officialResponse, signOff }, updated);

    // Notify requester
    this.createNotification({
      userId: updated.requestedBy,
      title: `RFI 已獲官方答覆：${updated.rfiCode}`,
      message: `${user.name} 已對「${updated.subject}」出具官方正式回覆。`,
      type: 'RFI_ANSWER',
      linkId: rfiId,
      linkType: 'RFI'
    });

    notifySubscribers();
    return updated;
  }

  public signRFI(rfiId: string, type: 'CLIENT' | 'PM'): RFI {
    const rfis = this.getRFIs();
    const index = rfis.findIndex(r => r.id === rfiId);
    if (index === -1) throw new Error('RFI not found');

    const user = this.getCurrentUser();
    const target = rfis[index];
    const isClient = type === 'CLIENT';

    const updated: RFI = {
      ...target,
      clientSigned: isClient ? true : target.clientSigned,
      pmSigned: !isClient ? true : target.pmSigned,
      updatedAt: new Date().toISOString()
    };

    // If both signed, can close
    if (updated.clientSigned && updated.pmSigned && updated.status === 'ANSWERED') {
      updated.status = 'CLOSED';
      updated.closedAt = new Date().toISOString();
    }

    rfis[index] = updated;
    setStored(STORAGE_KEYS.RFIS, rfis);

    this.addRfiHistory({
      rfiId,
      actorId: user.id,
      actorName: user.name,
      action: `${isClient ? '業主/第三方稽核' : '專案經理 (PM)'} 完成簽署`,
      note: updated.status === 'CLOSED' ? '雙方確認簽章完備，系統自動結案' : '已完成數位確認簽名',
      timestamp: new Date().toISOString()
    });

    notifySubscribers();
    return updated;
  }

  private addRfiHistory(history: Omit<RFIHistory, 'id'>) {
    const histories = getStored<RFIHistory[]>(STORAGE_KEYS.RFI_HISTORIES, INITIAL_RFI_HISTORIES);
    const newHist: RFIHistory = {
      ...history,
      id: 'hist-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5)
    };
    setStored(STORAGE_KEYS.RFI_HISTORIES, [newHist, ...histories]);
  }

  // --- Attachments & S3 Presigned URL Flow ---
  public getAttachments(entityType?: 'TASK' | 'RFI' | 'COMMENT', entityId?: string): Attachment[] {
    const list = getStored<Attachment[]>(STORAGE_KEYS.ATTACHMENTS, INITIAL_ATTACHMENTS);
    if (!entityType || !entityId) return list;
    return list.filter(a => a.entityType === entityType && a.entityId === entityId);
  }

  /**
   * Simulates SRS 4.4: POST /api/v1/attachments/presigned-url
   */
  public async getPresignedUrl(fileName: string, mimeType: string, entityType: 'TASK' | 'RFI' | 'COMMENT', entityId: string): Promise<{
    uploadUrl: string;
    fileUrl: string;
    storageKey: string;
    attachmentId: string;
  }> {
    const attachmentId = 'att-' + Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `bld1/${entityType.toLowerCase()}s/${entityId}/${Date.now()}_${safeName}`;
    
    // Simulate real network request to backend
    await new Promise(r => setTimeout(r, 200));

    const uploadUrl = `https://s3.ap-northeast-1.amazonaws.com/pms-bld1-storage/${storageKey}?X-Amz-Signature=mock9f4e2&Expires=3600`;
    
    // For images, we can generate a preview URL or use realistic mock architecture photos
    let fileUrl = 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=1000&auto=format&fit=crop&q=80';
    if (mimeType.includes('image')) {
      fileUrl = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1000&auto=format&fit=crop&q=80';
    }

    this.logApiCall(
      'POST',
      '/api/v1/attachments/presigned-url',
      200,
      { fileName, mimeType, entityType, entityId },
      { uploadUrl, fileUrl, storageKey, attachmentId }
    );

    return { uploadUrl, fileUrl, storageKey, attachmentId };
  }

  /**
   * Simulates SRS 4.4: POST /api/v1/attachments/complete
   */
  public completeAttachment(attachment: Attachment): Attachment {
    const attachments = getStored<Attachment[]>(STORAGE_KEYS.ATTACHMENTS, INITIAL_ATTACHMENTS);
    const updated = [attachment, ...attachments];
    setStored(STORAGE_KEYS.ATTACHMENTS, updated);

    this.logApiCall('POST', '/api/v1/attachments/complete', 201, attachment, { success: true, attachmentId: attachment.id });
    notifySubscribers();
    return attachment;
  }

  public deleteAttachment(attachmentId: string): void {
    const list = getStored<Attachment[]>(STORAGE_KEYS.ATTACHMENTS, INITIAL_ATTACHMENTS).filter(a => a.id !== attachmentId);
    setStored(STORAGE_KEYS.ATTACHMENTS, list);
    this.logApiCall('DELETE', `/api/v1/attachments/${attachmentId}`, 204);
    notifySubscribers();
  }

  // --- Comments & Mentions ---
  public getComments(taskId: string): Comment[] {
    const comments = getStored<Comment[]>(STORAGE_KEYS.COMMENTS, INITIAL_COMMENTS);
    return comments.filter(c => c.taskId === taskId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public addComment(taskId: string, content: string, mentions: string[]): Comment {
    const user = this.getCurrentUser();
    const newComment: Comment = {
      id: 'comm-' + Date.now(),
      taskId,
      authorId: user.id,
      authorName: user.name,
      authorAvatar: user.avatar,
      content,
      mentions,
      createdAt: new Date().toISOString()
    };

    const all = getStored<Comment[]>(STORAGE_KEYS.COMMENTS, INITIAL_COMMENTS);
    setStored(STORAGE_KEYS.COMMENTS, [...all, newComment]);

    this.logApiCall('POST', `/api/v1/tasks/${taskId}/comments`, 201, { content, mentions }, newComment);

    // Send notifications to mentioned users
    mentions.forEach(mentionedUserId => {
      if (mentionedUserId !== user.id) {
        this.createNotification({
          userId: mentionedUserId,
          title: `${user.name} 在任務中提及了您`,
          message: content.length > 80 ? content.substring(0, 80) + '...' : content,
          type: 'MENTION',
          linkId: taskId,
          linkType: 'TASK'
        });
      }
    });

    notifySubscribers();
    return newComment;
  }

  // --- Notifications ---
  public getNotifications(userId?: string): NotificationItem[] {
    const current = userId || this.getCurrentUser().id;
    const all = getStored<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, [
      {
        id: 'notif-1',
        userId: 'usr-pm-1',
        title: 'RFI-BLD1-2026-0041 雙方簽署完成',
        message: 'B2F 冰水主機房風管衝突已取得業主技師簽署認可。',
        type: 'RFI_SIGN',
        read: false,
        linkId: 'rfi-1',
        linkType: 'RFI',
        createdAt: '2026-09-09T16:25:00Z'
      },
      {
        id: 'notif-2',
        userId: 'usr-pm-1',
        title: '新工程疑問單待審查',
        message: '黃郁婷 提出了 RFI-BLD1-2026-0043「緊急發電機測試排程」。',
        type: 'ASSIGN',
        read: false,
        linkId: 'rfi-3',
        linkType: 'RFI',
        createdAt: '2026-09-10T14:05:00Z'
      }
    ]);
    return all.filter(n => n.userId === current).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createNotification(item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>): void {
    const all = getStored<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const newItem: NotificationItem = {
      ...item,
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      read: false,
      createdAt: new Date().toISOString()
    };
    setStored(STORAGE_KEYS.NOTIFICATIONS, [newItem, ...all]);
    notifySubscribers();
  }

  public markNotificationAsRead(id: string): void {
    const all = getStored<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const target = all.find(n => n.id === id);
    if (target) {
      target.read = true;
      setStored(STORAGE_KEYS.NOTIFICATIONS, all);
      notifySubscribers();
    }
  }

  public markAllNotificationsAsRead(userId: string): void {
    const all = getStored<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    all.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    setStored(STORAGE_KEYS.NOTIFICATIONS, all);
    notifySubscribers();
  }

  // --- Reset Database to Seed Data ---
  public resetToSeedData(): void {
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.RFIS);
    localStorage.removeItem(STORAGE_KEYS.COLUMNS);
    localStorage.removeItem(STORAGE_KEYS.ATTACHMENTS);
    localStorage.removeItem(STORAGE_KEYS.COMMENTS);
    localStorage.removeItem(STORAGE_KEYS.RFI_HISTORIES);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.API_LOGS);
    notifySubscribers();
  }
}

export const apiService = new ApiService();
