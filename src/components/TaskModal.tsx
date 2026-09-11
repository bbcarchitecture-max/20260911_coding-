import React, { useState, useEffect } from 'react';
import {
  X, Calendar, Tag,
  Link2, Paperclip, MessageSquare, Send, CheckCircle2, Shield, Layers,
  Trash2
} from 'lucide-react';
import { Task, Priority, User, RFI } from '../types';
import { apiService } from '../services/apiService';
import { MarkdownEditorWithPaste } from './MarkdownEditorWithPaste';
import { AttachmentList } from './AttachmentList';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultColumnId?: string;
  onSave: (task: Task) => void;
  onPreviewImage: (imageUrl: string, fileName: string) => void;
  onOpenRfi?: (rfiId: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  task,
  defaultColumnId = 'col-backlog',
  onSave,
  onPreviewImage,
  onOpenRfi
}) => {
  const users = apiService.getUsers();
  const columns = apiService.getColumns();
  const allRfis = apiService.getRFIs();
  const currentUser = apiService.getCurrentUser();

  const isNew = !task;
  const canEdit = apiService.checkPermission(currentUser.role, isNew ? 'CREATE_TASK' : 'EDIT_TASK');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState(defaultColumnId);
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [progress, setProgress] = useState(0);
  const [isMilestone, setIsMilestone] = useState(false);
  const [milestone, setMilestone] = useState('');
  const [assigneeId, setAssigneeId] = useState(currentUser.id);
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [relatedRfiIds, setRelatedRfiIds] = useState<string[]>([]);

  // Comments State
  const [comments, setComments] = useState(task ? apiService.getComments(task.id) : []);
  const [newComment, setNewComment] = useState('');

  // Active Tab within modal
  const [activeSubTab, setActiveSubTab] = useState<'details' | 'attachments' | 'comments' | 'rfis'>('details');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setColumnId(task.columnId);
      setPriority(task.priority);
      setStartDate(task.startDate ? task.startDate.split('T')[0] : '');
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setProgress(task.progress ?? (task.columnId === 'col-done' ? 100 : 0));
      setIsMilestone(!!task.isMilestone);
      setMilestone(task.milestone || '');
      setAssigneeId(task.assigneeId);
      setCollaboratorIds(task.collaboratorIds || []);
      setTags(task.tags || []);
      setModuleName(task.moduleName || '');
      setRelatedRfiIds(task.relatedRfiIds || []);
      setComments(apiService.getComments(task.id));
    } else {
      setTitle('');
      setDescription('');
      setColumnId(defaultColumnId);
      setPriority('MEDIUM');
      const now = new Date();
      setStartDate(now.toISOString().split('T')[0]);
      setDueDate(new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0]);
      setProgress(0);
      setIsMilestone(false);
      setMilestone('M1: PHASE A');
      setAssigneeId(currentUser.id);
      setCollaboratorIds([]);
      setTags(['CIVIL']);
      setModuleName('ENGINEERING');
      setRelatedRfiIds([]);
      setComments([]);
    }
  }, [task, defaultColumnId, isOpen, currentUser.id]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toUpperCase())) {
      setTags([...tags, tagInput.trim().toUpperCase()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const toggleCollaborator = (userId: string) => {
    if (collaboratorIds.includes(userId)) {
      setCollaboratorIds(collaboratorIds.filter(id => id !== userId));
    } else {
      setCollaboratorIds([...collaboratorIds, userId]);
    }
  };

  const toggleRfiLink = (rfiId: string) => {
    if (relatedRfiIds.includes(rfiId)) {
      setRelatedRfiIds(relatedRfiIds.filter(id => id !== rfiId));
    } else {
      setRelatedRfiIds([...relatedRfiIds, rfiId]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('SPECIFY TASK TITLE');
      return;
    }

    if (isNew) {
      const created = apiService.createTask({
        projectId: apiService.getProject().id,
        columnId,
        title,
        description,
        priority,
        startDate: startDate || new Date().toISOString().split('T')[0],
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        progress: Number(progress) || 0,
        isMilestone,
        milestone,
        createdBy: currentUser.id,
        assigneeId,
        collaboratorIds,
        tags,
        moduleName,
        relatedRfiIds
      });
      onSave(created);
    } else if (task) {
      const updated = apiService.updateTask(task.id, {
        columnId,
        title,
        description,
        priority,
        startDate: startDate || task.startDate,
        dueDate: dueDate || task.dueDate,
        progress: Number(progress) || 0,
        isMilestone,
        milestone,
        assigneeId,
        collaboratorIds,
        tags,
        moduleName,
        relatedRfiIds
      });
      onSave(updated);
    }
    onClose();
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !task) return;

    const created = apiService.addComment(task.id, newComment.trim(), []);

    setComments([...comments, created]);
    setNewComment('');
  };

  return (
    <div
      id="task-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="task-modal-container"
        className="bg-white border-2 border-black w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-neutral-100">
          <div className="flex items-center space-x-3 font-mono">
            <span className="px-2 py-0.5 text-xs font-bold border-2 border-black bg-black text-white uppercase">
              {priority} PRIORITY
            </span>
            <span className="text-xs text-black font-bold">
              {task ? `ID: ${task.id}` : 'NEW WORK ITEM'}
            </span>
            {!canEdit && (
              <span className="inline-flex items-center px-2 py-0.5 border border-black text-[10px] uppercase font-bold bg-neutral-200">
                <Shield className="w-3 h-3 mr-1" /> READ ONLY
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1 border border-black hover:bg-black hover:text-white transition-colors duration-100"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Tab Navigation in Modal */}
        <div className="flex items-center space-x-1 px-6 pt-2 border-b-2 border-black bg-white font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('details')}
            className={`px-4 py-2 uppercase font-bold border-b-2 transition-colors duration-100 flex items-center space-x-1.5 ${
              activeSubTab === 'details'
                ? 'border-black text-black bg-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-black'
            }`}
          >
            <Layers className="w-3.5 h-3.5" strokeWidth={2} />
            <span>DETAILS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('attachments')}
            className={`px-4 py-2 uppercase font-bold border-b-2 transition-colors duration-100 flex items-center space-x-1.5 ${
              activeSubTab === 'attachments'
                ? 'border-black text-black bg-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-black'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" strokeWidth={2} />
            <span>ATTACHMENTS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('rfis')}
            className={`px-4 py-2 uppercase font-bold border-b-2 transition-colors duration-100 flex items-center space-x-1.5 ${
              activeSubTab === 'rfis'
                ? 'border-black text-black bg-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-black'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" strokeWidth={2} />
            <span>LINKED RFIS ({relatedRfiIds.length})</span>
          </button>
          {task && (
            <button
              type="button"
              onClick={() => setActiveSubTab('comments')}
              className={`px-4 py-2 uppercase font-bold border-b-2 transition-colors duration-100 flex items-center space-x-1.5 ${
                activeSubTab === 'comments'
                  ? 'border-black text-black bg-neutral-100'
                  : 'border-transparent text-neutral-500 hover:text-black'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" strokeWidth={2} />
              <span>COMMENTS ({comments.length})</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeSubTab === 'details' && (
            <>
              {/* Task Title */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  TASK TITLE <span className="text-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="SPECIFY TASK TITLE..."
                  className="w-full px-3.5 py-2.5 border-2 border-black font-serif font-bold text-base text-black focus:outline-none disabled:bg-neutral-100"
                />
              </div>

              {/* Grid: Status, Priority, Due Date, Module */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                <div>
                  <label className="block font-bold text-neutral-500 uppercase mb-1">
                    COLUMN / STAGE
                  </label>
                  <select
                    value={columnId}
                    disabled={!canEdit}
                    onChange={e => setColumnId(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black uppercase bg-white text-black font-bold focus:outline-none"
                  >
                    {columns.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-500 uppercase mb-1">
                    PRIORITY LEVEL
                  </label>
                  <select
                    value={priority}
                    disabled={!canEdit}
                    onChange={e => setPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 border-2 border-black uppercase bg-white text-black font-bold focus:outline-none"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT (CRITICAL)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-500 uppercase mb-1">
                    DEADLINE (DUE DATE)
                  </label>
                  <input
                    type="date"
                    disabled={!canEdit}
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black uppercase bg-white text-black font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-500 uppercase mb-1">
                    MODULE / DIVISION
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={moduleName}
                    onChange={e => setModuleName(e.target.value)}
                    placeholder="ENGINEERING / MEP"
                    className="w-full px-3 py-2 border-2 border-black uppercase bg-white text-black font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Timeline Scheduling Section */}
              <div className="p-4 border-2 border-black bg-neutral-50 space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-black" strokeWidth={2} />
                    <span className="text-xs font-bold uppercase text-black">SCHEDULE &amp; TIMELINE CONTROLS</span>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold uppercase text-black">
                    <input
                      type="checkbox"
                      checked={isMilestone}
                      disabled={!canEdit}
                      onChange={e => setIsMilestone(e.target.checked)}
                      className="w-4 h-4 border-2 border-black accent-black cursor-pointer"
                    />
                    <span>CRITICAL MILESTONE</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-neutral-500 uppercase mb-1">
                      START DATE
                    </label>
                    <input
                      type="date"
                      disabled={!canEdit}
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-black uppercase bg-white text-black font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-500 uppercase mb-1">
                      FINISH DATE
                    </label>
                    <input
                      type="date"
                      disabled={!canEdit}
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-black uppercase bg-white text-black font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-neutral-500 uppercase">
                        EXECUTION PROGRESS
                      </label>
                      <span className="font-bold text-black border border-black px-1">{progress}%</span>
                    </div>
                    <div className="pt-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        disabled={!canEdit}
                        value={progress}
                        onChange={e => setProgress(Number(e.target.value))}
                        className="w-full accent-black cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Description with Markdown Editor */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  SPECIFICATION DESCRIPTION &amp; FIELD NOTES
                </label>
                <MarkdownEditorWithPaste
                  value={description}
                  onChange={setDescription}
                  entityType="TASK"
                  entityId={task ? task.id : 'new-task'}
                  placeholder="DETAILED SPECIFICATION (SUPPORTS MARKDOWN &amp; SCREENSHOT ATTACHMENT)..."
                  minHeight="140px"
                />
              </div>

              {/* Personnel Assignment & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div>
                  <label className="block font-bold text-neutral-500 uppercase mb-1">
                    PRIMARY ASSIGNEE (LEAD)
                  </label>
                  <select
                    value={assigneeId}
                    disabled={!canEdit}
                    onChange={e => setAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black uppercase bg-white text-black font-bold focus:outline-none"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name.toUpperCase()} — {u.title.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-500 uppercase mb-1">
                    CLASSIFICATION TAGS
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="ENTER TAG &amp; HIT ENTER"
                      className="flex-1 px-3 py-2 border-2 border-black uppercase bg-white text-black font-bold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-2 border-2 border-black bg-black text-white hover:bg-white hover:text-black font-bold uppercase transition-colors duration-100"
                    >
                      ADD
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.map(t => (
                      <span
                        key={t}
                        className="inline-flex items-center border border-black bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase"
                      >
                        <span>#{t}</span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(t)}
                            className="ml-1 text-neutral-500 hover:text-black font-bold"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSubTab === 'attachments' && (
            <AttachmentList
              entityType="TASK"
              entityId={task ? task.id : 'temp'}
              onPreviewImage={onPreviewImage}
              canEdit={canEdit}
            />
          )}

          {activeSubTab === 'rfis' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-black">
                <span className="text-[10px] uppercase font-bold text-neutral-500">
                  LINKED RFIS (REQUEST FOR INFORMATION)
                </span>
                <span className="text-[10px] text-neutral-500 uppercase">
                  {relatedRfiIds.length} CONNECTED
                </span>
              </div>

              {allRfis.map(r => {
                const isLinked = relatedRfiIds.includes(r.id);
                return (
                  <div
                    key={r.id}
                    onClick={() => canEdit && toggleRfiLink(r.id)}
                    className={`p-3 border-2 transition-colors duration-100 flex items-center justify-between cursor-pointer ${
                      isLinked ? 'border-black bg-neutral-100' : 'border-neutral-300 hover:border-black bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold border-b border-black">{r.rfiCode}</span>
                        <span className="font-bold text-black font-serif">{r.subject}</span>
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-1">
                        STATUS: {r.status} // DUE: {r.dueDate}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`px-3 py-1 text-[10px] font-bold uppercase border border-black ${
                        isLinked ? 'bg-black text-white' : 'hover:bg-black hover:text-white'
                      }`}
                    >
                      {isLinked ? 'LINKED ✓' : '+ LINK'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeSubTab === 'comments' && task && (
            <div className="space-y-4 font-mono text-xs">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-neutral-400 uppercase">NO COMMENTS LOGGED</div>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="p-3 border-2 border-black bg-white space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-neutral-500">
                        <span className="font-bold text-black uppercase">{c.authorName}</span>
                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="font-serif text-xs text-black whitespace-pre-wrap pt-1">
                        {c.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center space-x-2 pt-2 border-t border-black">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="WRITE COMMENT..."
                  className="flex-1 px-3 py-2 border-2 border-black uppercase text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-black text-white border-2 border-black hover:bg-white hover:text-black font-bold uppercase text-xs transition-colors duration-100 disabled:opacity-40"
                >
                  SEND
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-black font-mono text-xs">
            {task && canEdit ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('PERMANENTLY DELETE THIS WORK ITEM?')) {
                    apiService.deleteTask(task.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 border border-black hover:bg-black hover:text-white uppercase font-bold text-neutral-700 hover:text-white transition-colors duration-100 flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>DELETE</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border-2 border-black bg-white hover:bg-neutral-100 text-black font-bold uppercase transition-colors duration-100"
              >
                CANCEL
              </button>
              {canEdit && (
                <button
                  type="submit"
                  className="px-5 py-2 bg-black text-white border-2 border-black hover:bg-white hover:text-black font-bold uppercase transition-colors duration-100 flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isNew ? 'CREATE ITEM' : 'SAVE CHANGES'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
