import React, { useState, useEffect } from 'react';
import {
  Plus, Calendar, Paperclip, MessageSquare, Link2,
  Tag, Layers, RefreshCw
} from 'lucide-react';
import { Task, Column, Priority, User, SwimlaneMode, RFI } from '../types';
import { apiService, subscribeToChanges } from '../services/apiService';

interface KanbanBoardProps {
  onOpenTaskModal: (task?: Task, columnId?: string) => void;
  onOpenRfiModal: (rfiId: string) => void;
  onPreviewImage: (imageUrl: string, fileName: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  onOpenTaskModal,
  onOpenRfiModal,
  onPreviewImage
}) => {
  const [tasks, setTasks] = useState<Task[]>(apiService.getTasks());
  const [columns, setColumns] = useState<Column[]>(apiService.getColumns());
  const [swimlaneMode, setSwimlaneMode] = useState<SwimlaneMode>('NONE');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterAssignee, setFilterAssignee] = useState<string>('ALL');

  // Drag and Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [dragOverTargetIndex, setDragOverTargetIndex] = useState<number | null>(null);
  const [rebalanceNotification, setRebalanceNotification] = useState<string | null>(null);

  const users = apiService.getUsers();
  const allRfis = apiService.getRFIs();
  const currentUser = apiService.getCurrentUser();
  const canMove = apiService.checkPermission(currentUser.role, 'MOVE_TASK');
  const canCreate = apiService.checkPermission(currentUser.role, 'CREATE_TASK');

  useEffect(() => {
    const unsub = subscribeToChanges(() => {
      setTasks(apiService.getTasks());
      setColumns(apiService.getColumns());
    });
    return unsub;
  }, []);

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.moduleName && t.moduleName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPriority = filterPriority === 'ALL' || t.priority === filterPriority;
    const matchesAssignee = filterAssignee === 'ALL' || t.assigneeId === filterAssignee;

    return matchesSearch && matchesPriority && matchesAssignee;
  });

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (!canMove) return;
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumnId(columnId);
    setDragOverTargetIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string, targetIndex: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    try {
      const { task, rebalanced } = apiService.moveTask(taskId, targetColumnId, targetIndex);
      setTasks(apiService.getTasks());

      if (rebalanced) {
        setRebalanceNotification(`LEXORANK AUTO-BALANCED: COLUMN [${targetColumnId}]`);
        setTimeout(() => setRebalanceNotification(null), 3000);
      }
    } catch (err) {
      console.error('Failed to move task', err);
    } finally {
      setDraggedTaskId(null);
      setDragOverColumnId(null);
      setDragOverTargetIndex(null);
    }
  };

  // Grouping by Swimlane
  const getSwimlaneGroups = () => {
    if (swimlaneMode === 'PRIORITY') {
      const priorities: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
      return priorities.map(p => ({
        id: p,
        title: `PRIORITY // ${p}`,
        filterFn: (t: Task) => t.priority === p
      }));
    }

    if (swimlaneMode === 'ASSIGNEE') {
      return users.map(u => ({
        id: u.id,
        title: `ASSIGNEE // ${u.name.toUpperCase()} (${u.role})`,
        filterFn: (t: Task) => t.assigneeId === u.id
      }));
    }

    if (swimlaneMode === 'MODULE') {
      const modules: string[] = Array.from(new Set(tasks.map(t => t.moduleName || 'GENERAL ENGINEERING')));
      return modules.map(m => ({
        id: m,
        title: `MODULE // ${m.toUpperCase()}`,
        filterFn: (t: Task) => (t.moduleName || 'GENERAL ENGINEERING') === m
      }));
    }

    return [{ id: 'all', title: '', filterFn: () => true }];
  };

  const swimlanes = getSwimlaneGroups();

  const renderPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="bg-black text-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest border border-black">
            URGENT
          </span>
        );
      case 'HIGH':
        return (
          <span className="bg-white text-black px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest border-2 border-black">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="bg-white text-neutral-800 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider border border-black">
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="bg-white text-neutral-500 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider border border-neutral-300">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Swimlane Control Bar */}
      <div className="border-2 border-black p-4 bg-white flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search & Select Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search work packages, tags, modules..."
            className="w-full sm:w-64 px-3 py-2 border-2 border-black text-xs font-mono placeholder:italic placeholder:text-neutral-400 focus:outline-none"
          />

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="px-3 py-2 border-2 border-black text-xs font-mono uppercase bg-white cursor-pointer focus:outline-none"
          >
            <option value="ALL">ALL PRIORITIES</option>
            <option value="URGENT">URGENT</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          <select
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            className="px-3 py-2 border-2 border-black text-xs font-mono uppercase bg-white cursor-pointer focus:outline-none hidden sm:block"
          >
            <option value="ALL">ALL ASSIGNEES</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Swimlane Horizontal Grouping Switcher */}
        <div className="flex flex-wrap items-center gap-3 justify-between lg:justify-end">
          <div className="flex items-center border-2 border-black p-0.5 text-xs font-mono">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 px-2 hidden sm:inline">
              SWIMLANE:
            </span>
            <button
              onClick={() => setSwimlaneMode('NONE')}
              className={`px-2.5 py-1 uppercase tracking-wider transition-colors duration-100 ${
                swimlaneMode === 'NONE' ? 'bg-black text-white font-bold' : 'text-black hover:bg-neutral-100'
              }`}
            >
              NONE
            </button>
            <button
              onClick={() => setSwimlaneMode('PRIORITY')}
              className={`px-2.5 py-1 uppercase tracking-wider transition-colors duration-100 ${
                swimlaneMode === 'PRIORITY' ? 'bg-black text-white font-bold' : 'text-black hover:bg-neutral-100'
              }`}
            >
              PRIORITY
            </button>
            <button
              onClick={() => setSwimlaneMode('ASSIGNEE')}
              className={`px-2.5 py-1 uppercase tracking-wider transition-colors duration-100 ${
                swimlaneMode === 'ASSIGNEE' ? 'bg-black text-white font-bold' : 'text-black hover:bg-neutral-100'
              }`}
            >
              ASSIGNEE
            </button>
            <button
              onClick={() => setSwimlaneMode('MODULE')}
              className={`px-2.5 py-1 uppercase tracking-wider transition-colors duration-100 ${
                swimlaneMode === 'MODULE' ? 'bg-black text-white font-bold' : 'text-black hover:bg-neutral-100'
              }`}
            >
              MODULE
            </button>
          </div>

          {canCreate && (
            <button
              onClick={() => onOpenTaskModal()}
              className="px-4 py-2 bg-black text-white hover:bg-white hover:text-black border-2 border-black text-xs font-mono font-bold flex items-center space-x-1.5 uppercase tracking-widest transition-colors duration-100"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              <span>NEW TASK</span>
            </button>
          )}
        </div>
      </div>

      {/* Lexorank Rebalance Notification Banner */}
      {rebalanceNotification && (
        <div className="bg-black text-white border-2 border-black px-4 py-2.5 text-xs font-mono uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center space-x-2 font-bold">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
            <span>{rebalanceNotification}</span>
          </div>
          <span className="text-[10px] text-neutral-400">STATUS 200 OK</span>
        </div>
      )}

      {/* Kanban Canvas */}
      <div className="space-y-8">
        {swimlanes.map(lane => {
          const laneTasks = filteredTasks.filter(lane.filterFn);

          return (
            <div key={lane.id} className="space-y-3">
              {swimlaneMode !== 'NONE' && (
                <div className="flex items-center justify-between border-b-2 border-black pb-2 pt-2">
                  <h3 className="font-display text-base font-bold tracking-tight text-black uppercase">
                    {lane.title}
                  </h3>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 border border-black bg-neutral-100">
                    COUNT: {laneTasks.length}
                  </span>
                </div>
              )}

              {/* Columns Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                {columns.map(col => {
                  const colTasks = laneTasks
                    .filter(t => t.columnId === col.id)
                    .sort((a, b) => a.position - b.position);

                  const isColumnOver = dragOverColumnId === col.id;

                  return (
                    <div
                      key={col.id}
                      onDragOver={e => handleDragOver(e, col.id, colTasks.length)}
                      onDrop={e => handleDrop(e, col.id, dragOverTargetIndex ?? colTasks.length)}
                      className={`border-2 p-3.5 flex flex-col min-h-[520px] transition-colors duration-100 bg-white ${
                        isColumnOver
                          ? 'border-black bg-neutral-100 outline outline-2 outline-black'
                          : 'border-black'
                      }`}
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-black">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 bg-black inline-block"></span>
                          <span className="font-display font-bold text-sm tracking-tight text-black uppercase">
                            {col.title}
                          </span>
                          <span className="font-mono text-xs px-1.5 py-0.2 border border-black bg-neutral-100 font-bold">
                            {colTasks.length}
                          </span>
                        </div>

                        {canCreate && (
                          <button
                            type="button"
                            onClick={() => onOpenTaskModal(undefined, col.id)}
                            className="p-1 border border-black hover:bg-black hover:text-white transition-colors duration-100"
                            title="Add card to this column"
                          >
                            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                          </button>
                        )}
                      </div>

                      {/* Cards Container */}
                      <div className="space-y-3 flex-1 overflow-y-auto">
                        {colTasks.map((task, index) => {
                          const assignee = users.find(u => u.id === task.assigneeId);
                          const isBeingDragged = draggedTaskId === task.id;
                          const taskAttachments = apiService.getAttachments('TASK', task.id);
                          const comments = apiService.getComments(task.id);
                          const firstImageAttachment = taskAttachments.find(a => a.mimeType.includes('image'));

                          return (
                            <div
                              key={task.id}
                              draggable={canMove}
                              onDragStart={e => handleDragStart(e, task.id)}
                              onDragOver={e => {
                                e.stopPropagation();
                                handleDragOver(e, col.id, index);
                              }}
                              onClick={() => onOpenTaskModal(task)}
                              className={`bg-white p-3.5 border transition-all duration-100 cursor-pointer space-y-2.5 select-none group relative ${
                                isBeingDragged
                                  ? 'opacity-30 border-dashed border-2 border-black'
                                  : 'border-black hover:border-2 hover:bg-neutral-50'
                              }`}
                            >
                              {/* Top Bar: Priority Badge + Lexorank Position */}
                              <div className="flex items-center justify-between">
                                {renderPriorityBadge(task.priority)}

                                <div className="flex items-center space-x-2">
                                  {task.moduleName && (
                                    <span className="text-[10px] font-mono text-neutral-500 uppercase">
                                      {task.moduleName}
                                    </span>
                                  )}
                                  <span className="text-[9px] font-mono text-neutral-400">
                                    #{Math.round(task.position)}
                                  </span>
                                </div>
                              </div>

                              {/* Card Title (Serif Hero) */}
                              <h4 className="font-serif font-bold text-sm text-black leading-snug group-hover:underline line-clamp-2">
                                {task.title}
                              </h4>

                              {/* Thumbnail preview if has image attachment */}
                              {firstImageAttachment && (
                                <div
                                  className="h-28 w-full border border-black overflow-hidden relative group/thumb grayscale hover:grayscale-0 transition-all duration-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPreviewImage(firstImageAttachment.fileUrl, firstImageAttachment.fileName);
                                  }}
                                >
                                  <img
                                    src={firstImageAttachment.fileUrl}
                                    alt={firstImageAttachment.fileName}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black text-white font-mono text-[9px] uppercase tracking-wider">
                                    VIEW
                                  </div>
                                </div>
                              )}

                              {/* Tags (Monochrome Minimalist) */}
                              {task.tags && task.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {task.tags.slice(0, 3).map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] font-mono border border-neutral-300 text-neutral-700 px-1.5 py-0.2 uppercase"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                  {task.tags.length > 3 && (
                                    <span className="text-[10px] font-mono text-neutral-400">
                                      +{task.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Linked RFI Badges */}
                              {task.relatedRfiIds && task.relatedRfiIds.length > 0 && (
                                <div className="space-y-1 pt-1">
                                  {task.relatedRfiIds.map(rfiId => {
                                    const linkedRfi = allRfis.find(r => r.id === rfiId);
                                    if (!linkedRfi) return null;
                                    return (
                                      <div
                                        key={rfiId}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenRfiModal(rfiId);
                                        }}
                                        className="inline-flex items-center space-x-1 px-2 py-0.5 font-mono text-[10px] font-bold border border-black hover:bg-black hover:text-white transition-colors duration-100"
                                      >
                                        <Link2 className="w-3 h-3" strokeWidth={1.5} />
                                        <span>{linkedRfi.rfiCode}</span>
                                        {linkedRfi.costImpact && (
                                          <span className="font-mono">
                                            [+${Math.round((linkedRfi.costAmount || 0) / 1000)}k]
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Card Footer: Due Date, Progress, Assignee */}
                              <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[11px] font-mono text-neutral-600">
                                <div className="flex items-center space-x-2">
                                  {task.isMilestone && (
                                    <span className="font-bold border border-black px-1 py-0.2 text-[9px] bg-neutral-100">
                                      ◆ MILESTONE
                                    </span>
                                  )}

                                  {task.dueDate && (
                                    <span className="flex items-center space-x-1">
                                      <Calendar className="w-3 h-3 text-black" strokeWidth={1.5} />
                                      <span>{task.dueDate.split('T')[0].slice(5)}</span>
                                    </span>
                                  )}

                                  {task.progress !== undefined && task.progress > 0 && (
                                    <span className="font-bold border border-neutral-400 px-1 py-0.2 text-[9px]">
                                      {task.progress}%
                                    </span>
                                  )}

                                  {taskAttachments.length > 0 && (
                                    <span className="flex items-center space-x-0.5" title={`${taskAttachments.length} attachments`}>
                                      <Paperclip className="w-3 h-3" strokeWidth={1.5} />
                                      <span>{taskAttachments.length}</span>
                                    </span>
                                  )}

                                  {comments.length > 0 && (
                                    <span className="flex items-center space-x-0.5" title={`${comments.length} comments`}>
                                      <MessageSquare className="w-3 h-3" strokeWidth={1.5} />
                                      <span>{comments.length}</span>
                                    </span>
                                  )}
                                </div>

                                {/* Assignee Square Icon */}
                                {assignee && (
                                  <div
                                    className="w-5 h-5 bg-black text-white font-mono text-[9px] font-bold flex items-center justify-center border border-black"
                                    title={`Assignee: ${assignee.name}`}
                                  >
                                    {assignee.name.slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {colTasks.length === 0 && (
                          <div className="h-32 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center text-xs font-mono text-neutral-400 space-y-1">
                            <span>NO WORK PACKAGES</span>
                            {canCreate && (
                              <button
                                type="button"
                                onClick={() => onOpenTaskModal(undefined, col.id)}
                                className="text-black underline font-bold uppercase tracking-wider text-[10px]"
                              >
                                + CREATE ITEM
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
