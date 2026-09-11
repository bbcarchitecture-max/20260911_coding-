import React, { useState, useEffect } from 'react';
import {
  X, AlertTriangle, CheckCircle2,
  FileCheck2, ShieldCheck, History, Send, Check
} from 'lucide-react';
import { RFI, RFIStatus } from '../types';
import { apiService } from '../services/apiService';
import { MarkdownEditorWithPaste } from './MarkdownEditorWithPaste';
import { AttachmentList } from './AttachmentList';

interface RFIModalProps {
  isOpen: boolean;
  onClose: () => void;
  rfi?: RFI | null;
  onSave: (rfi: RFI) => void;
  onPreviewImage: (imageUrl: string, fileName: string) => void;
}

export const RFIModal: React.FC<RFIModalProps> = ({
  isOpen,
  onClose,
  rfi,
  onSave,
  onPreviewImage
}) => {
  const users = apiService.getUsers();
  const currentUser = apiService.getCurrentUser();
  const isNew = !rfi;

  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [suggestedSolution, setSuggestedSolution] = useState('');
  const [officialResponse, setOfficialResponse] = useState('');
  const [status, setStatus] = useState<RFIStatus>('SUBMITTED');
  const [costImpact, setCostImpact] = useState(false);
  const [costAmount, setCostAmount] = useState(0);
  const [scheduleImpact, setScheduleImpact] = useState(0);
  const [assignedTo, setAssignedTo] = useState('usr-pm-1');
  const [requestedBy, setRequestedBy] = useState(currentUser.id);
  const [dueDate, setDueDate] = useState('');

  const [histories, setHistories] = useState(rfi ? apiService.getRFIHistories(rfi.id) : []);
  const [activeTab, setActiveTab] = useState<'content' | 'response' | 'attachments' | 'history'>('content');

  useEffect(() => {
    if (rfi) {
      setSubject(rfi.subject);
      setQuestion(rfi.question);
      setSuggestedSolution(rfi.suggestedSolution || '');
      setOfficialResponse(rfi.officialResponse || '');
      setStatus(rfi.status);
      setCostImpact(rfi.costImpact);
      setCostAmount(rfi.costAmount || 0);
      setScheduleImpact(rfi.scheduleImpact);
      setAssignedTo(rfi.assignedTo);
      setRequestedBy(rfi.requestedBy);
      setDueDate(rfi.dueDate ? rfi.dueDate.split('T')[0] : '');
      setHistories(apiService.getRFIHistories(rfi.id));
    } else {
      setSubject('');
      setQuestion('');
      setSuggestedSolution('');
      setOfficialResponse('');
      setStatus('SUBMITTED');
      setCostImpact(false);
      setCostAmount(0);
      setScheduleImpact(0);
      setAssignedTo('usr-pm-1');
      setRequestedBy(currentUser.id);
      setDueDate(new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]);
      setHistories([]);
    }
  }, [rfi, isOpen, currentUser.id]);

  if (!isOpen) return null;

  const canEditBase = isNew || currentUser.role === 'PM' || currentUser.role === 'SUPER_ADMIN' || rfi?.requestedBy === currentUser.id;
  const canReply = currentUser.role === 'PM' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'GUEST_AUDITOR' || rfi?.assignedTo === currentUser.id;
  const canClose = currentUser.role === 'PM' || currentUser.role === 'SUPER_ADMIN';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !question.trim()) {
      alert('ENTER SUBJECT AND QUESTION DETAILS');
      return;
    }

    if (isNew) {
      const created = apiService.createRFI({
        projectId: apiService.getProject().id,
        subject,
        question,
        suggestedSolution,
        officialResponse,
        status,
        costImpact,
        costAmount: costImpact ? Number(costAmount) : 0,
        scheduleImpact: Number(scheduleImpact) || 0,
        assignedTo,
        requestedBy,
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        relatedTaskIds: []
      });
      onSave(created);
    } else if (rfi) {
      const updated = apiService.updateRFI(rfi.id, {
        subject,
        question,
        suggestedSolution,
        status,
        costImpact,
        costAmount: costImpact ? Number(costAmount) : 0,
        scheduleImpact: Number(scheduleImpact) || 0,
        assignedTo,
        dueDate
      });
      onSave(updated);
    }
    onClose();
  };

  const handleSubmitOfficialResponse = () => {
    if (!rfi) return;
    if (!officialResponse.trim()) {
      alert('ENTER OFFICIAL RESPONSE TEXT');
      return;
    }

    const updated = apiService.replyRFI(rfi.id, officialResponse, true);
    setHistories(apiService.getRFIHistories(rfi.id));
    onSave(updated);
    alert('OFFICIAL RESPONSE RECORDED');
  };

  const handleSign = (type: 'CLIENT' | 'PM') => {
    if (!rfi) return;
    const updated = apiService.signRFI(rfi.id, type);
    setHistories(apiService.getRFIHistories(rfi.id));
    onSave(updated);
  };

  const handleStatusTransition = (newStatus: RFIStatus) => {
    if (!rfi) return;
    const updated = apiService.updateRFI(rfi.id, { status: newStatus });
    setStatus(newStatus);
    setHistories(apiService.getRFIHistories(rfi.id));
    onSave(updated);
  };

  const stages: { key: RFIStatus; label: string }[] = [
    { key: 'SUBMITTED', label: '1. SUBMITTED' },
    { key: 'IN_REVIEW', label: '2. IN REVIEW' },
    { key: 'ANSWERED', label: '3. ANSWERED' },
    { key: 'CLOSED', label: '4. CLOSED' }
  ];

  return (
    <div
      id="rfi-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="rfi-modal-container"
        className="bg-white border-2 border-black w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Serial Code & Status Flow */}
        <div className="px-6 py-4 border-b-2 border-black bg-neutral-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 font-mono">
              <span className="text-base font-bold px-2.5 py-1 bg-black text-white border-2 border-black tracking-wider">
                {rfi ? rfi.rfiCode : apiService.generateNextRfiCode()}
              </span>
              <span className="px-2 py-1 text-xs uppercase font-bold border-2 border-black bg-white">
                {status}
              </span>
              {rfi?.costImpact && (
                <span className="text-xs border border-black bg-black text-white px-2 py-0.5 font-bold">
                  COST: +${rfi.costAmount?.toLocaleString()}
                </span>
              )}
              {rfi?.scheduleImpact ? (
                <span className="text-xs border border-black bg-neutral-200 px-2 py-0.5 font-bold">
                  SCHEDULE: +{rfi.scheduleImpact} DAYS
                </span>
              ) : null}
            </div>

            <button
              onClick={onClose}
              className="p-1 border border-black hover:bg-black hover:text-white transition-colors duration-100"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* RFI Lifecycle Progress Bar */}
          <div className="mt-3 pt-3 border-t border-black/20 flex items-center justify-between text-xs font-mono select-none">
            {stages.map((step, idx) => {
              const allStageKeys: RFIStatus[] = ['SUBMITTED', 'IN_REVIEW', 'ANSWERED', 'CLOSED'];
              const currentIdx = allStageKeys.indexOf(status);
              const stepIdx = allStageKeys.indexOf(step.key);
              const isPast = currentIdx >= stepIdx;
              const isCurrent = status === step.key;

              return (
                <div key={step.key} className="flex items-center space-x-2">
                  <div
                    className={`w-6 h-6 border border-black flex items-center justify-center text-xs font-bold ${
                      isCurrent
                        ? 'bg-black text-white'
                        : isPast
                        ? 'bg-neutral-300 text-black'
                        : 'bg-white text-neutral-400'
                    }`}
                  >
                    {isPast && !isCurrent ? '✓' : idx + 1}
                  </div>
                  <span className={`uppercase font-bold ${isCurrent ? 'text-black' : isPast ? 'text-neutral-700' : 'text-neutral-400'}`}>
                    {step.label}
                  </span>
                  {idx < 3 && <div className="w-8 h-px bg-black/40 hidden sm:block"></div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-6 pt-2 border-b-2 border-black bg-white font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 uppercase font-bold border-b-2 transition-colors duration-100 ${
              activeTab === 'content'
                ? 'border-black text-black bg-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-black'
            }`}
          >
            QUESTION &amp; IMPACTS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('response')}
            className={`px-4 py-2 uppercase font-bold border-b-2 transition-colors duration-100 flex items-center space-x-1.5 ${
              activeTab === 'response'
                ? 'border-black text-black bg-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-black'
            }`}
          >
            <span>RESPONSE &amp; SIGN-OFF</span>
            {rfi?.officialResponse && (
              <span className="w-2 h-2 bg-black"></span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attachments')}
            className={`px-4 py-2 uppercase font-bold border-b-2 transition-colors duration-100 ${
              activeTab === 'attachments'
                ? 'border-black text-black bg-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-black'
            }`}
          >
            ATTACHMENTS
          </button>
          {rfi && (
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 uppercase font-bold border-b-2 transition-colors duration-100 flex items-center space-x-1.5 ${
                activeTab === 'history'
                  ? 'border-black text-black bg-neutral-100'
                  : 'border-transparent text-neutral-500 hover:text-black'
              }`}
            >
              <History className="w-3.5 h-3.5" strokeWidth={2} />
              <span>AUDIT TRAIL ({histories.length})</span>
            </button>
          )}
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'content' && (
            <>
              {/* Subject */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  RFI SUBJECT <span className="text-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!canEditBase}
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="SUBJECT OF INQUIRY..."
                  className="w-full px-3.5 py-2.5 border-2 border-black font-serif font-bold text-base text-black focus:outline-none disabled:bg-neutral-100"
                />
              </div>

              {/* Roles & Due Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border-2 border-black bg-neutral-50 font-mono text-xs">
                <div>
                  <label className="block font-bold text-neutral-500 uppercase mb-1">
                    REQUESTED BY
                  </label>
                  <select
                    value={requestedBy}
                    disabled={!canEditBase}
                    onChange={e => setRequestedBy(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black uppercase bg-white text-black font-bold focus:outline-none"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name.toUpperCase()} ({u.title.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-500 uppercase mb-1">
                    ASSIGNED RESPONDENT
                  </label>
                  <select
                    value={assignedTo}
                    disabled={!canEditBase}
                    onChange={e => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black uppercase bg-white text-black font-bold focus:outline-none"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name.toUpperCase()} ({u.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-500 uppercase mb-1">
                    RESPONSE DUE DATE
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    disabled={!canEditBase}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black uppercase bg-white text-black font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  QUESTION DETAILS
                </label>
                <MarkdownEditorWithPaste
                  value={question}
                  onChange={setQuestion}
                  entityType="RFI"
                  entityId={rfi ? rfi.id : 'temp-rfi'}
                  placeholder="DETAILED TECHNICAL QUESTION..."
                  minHeight="140px"
                />
              </div>

              {/* Suggested Solution */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  SUGGESTED SOLUTION (CONTRACTOR PROPOSAL)
                </label>
                <textarea
                  rows={3}
                  disabled={!canEditBase}
                  value={suggestedSolution}
                  onChange={e => setSuggestedSolution(e.target.value)}
                  placeholder="PROPOSED MITIGATION OR REVISED SPECS..."
                  className="w-full px-3.5 py-2.5 border-2 border-black font-serif text-xs text-black focus:outline-none leading-relaxed"
                />
              </div>

              {/* Impact Assessment Fields */}
              <div className="p-4 border-2 border-black bg-neutral-50 space-y-3 font-mono">
                <div className="flex items-center space-x-2 text-xs font-bold text-black uppercase">
                  <AlertTriangle className="w-4 h-4 text-black" strokeWidth={2} />
                  <span>IMPACT ASSESSMENT CONTROLS</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
                  {/* Schedule Impact */}
                  <div className="border border-black p-3 bg-white flex items-center justify-between">
                    <div>
                      <span className="font-bold text-black block uppercase">SCHEDULE IMPACT</span>
                      <span className="text-[10px] text-neutral-500 uppercase">PREDICTED CRITICAL PATH DELAY</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="180"
                        disabled={!canEditBase}
                        value={scheduleImpact}
                        onChange={e => setScheduleImpact(Number(e.target.value))}
                        className="w-20 px-2 py-1.5 border-2 border-black text-center font-bold text-black"
                      />
                      <span className="font-bold uppercase">DAYS</span>
                    </div>
                  </div>

                  {/* Cost Impact */}
                  <div className="border border-black p-3 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-black uppercase">COST VARIATION</span>
                      <label className="flex items-center space-x-2 cursor-pointer uppercase font-bold">
                        <input
                          type="checkbox"
                          checked={costImpact}
                          disabled={!canEditBase}
                          onChange={e => setCostImpact(e.target.checked)}
                          className="w-4 h-4 border-2 border-black accent-black cursor-pointer"
                        />
                        <span>{costImpact ? 'YES (VARIATION)' : 'NO'}</span>
                      </label>
                    </div>

                    {costImpact && (
                      <div className="flex items-center space-x-2 pt-1">
                        <span className="text-[11px] text-neutral-500 uppercase">AMOUNT:</span>
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1.5 text-xs text-black font-bold">$</span>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            disabled={!canEditBase}
                            value={costAmount}
                            onChange={e => setCostAmount(Number(e.target.value))}
                            className="w-full pl-6 pr-3 py-1.5 border-2 border-black text-xs font-bold text-black"
                          />
                        </div>
                        <span className="uppercase text-neutral-500">USD</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'response' && (
            <div className="space-y-6 font-mono">
              {/* Official Formal Response Editor */}
              <div className="p-4 border-2 border-black bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileCheck2 className="w-5 h-5 text-black" strokeWidth={2} />
                    <span className="text-sm font-bold uppercase text-black">OFFICIAL FORMAL RESPONSE</span>
                  </div>
                  {status === 'ANSWERED' && (
                    <span className="text-xs font-bold px-2 py-0.5 border border-black bg-black text-white uppercase">
                      APPROVED
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-600 font-serif leading-relaxed">
                  Project Engineers and PMs issue binding contractual clarifications and approval notices here.
                </p>

                <textarea
                  rows={5}
                  value={officialResponse}
                  disabled={!canReply}
                  onChange={e => setOfficialResponse(e.target.value)}
                  placeholder="SPECIFY OFFICIAL TECHNICAL RESOLUTION, APPLICABLE STANDARDS, AND DRAWING REVISIONS..."
                  className="w-full px-3.5 py-2.5 border-2 border-black font-serif text-xs text-black focus:outline-none leading-relaxed"
                />

                {canReply && rfi && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSubmitOfficialResponse}
                      className="px-4 py-2 bg-black text-white border-2 border-black hover:bg-white hover:text-black font-bold uppercase text-xs transition-colors duration-100 flex items-center space-x-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>SUBMIT OFFICIAL RESPONSE</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Dual-party Confirmation Stamps */}
              {rfi && (
                <div className="p-4 border-2 border-black bg-neutral-50 space-y-4">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-black" strokeWidth={2} />
                    <span className="text-sm font-bold uppercase text-black">DUAL-PARTY DIGITAL SIGN-OFF</span>
                  </div>
                  <p className="text-xs text-neutral-600 font-serif">
                    Both Project Management and Third-party Client Inspector signatures are required for formal closure.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* PM Sign-off */}
                    <div className="p-4 border-2 border-black bg-white flex flex-col justify-between space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-black">PROJECT MANAGER (PM)</span>
                        {rfi.pmSigned ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold border border-black bg-black text-white flex items-center space-x-1 uppercase">
                            <Check className="w-3 h-3" />
                            <span>SIGNED</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold border border-neutral-400 text-neutral-500 uppercase">
                            AWAITING SIGN
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-serif text-neutral-600">
                        {rfi.pmSigned ? 'Feasibility and variation scope confirmed.' : 'Requires technical approval.'}
                      </div>

                      {!rfi.pmSigned && (currentUser.role === 'PM' || currentUser.role === 'SUPER_ADMIN') && (
                        <button
                          type="button"
                          onClick={() => handleSign('PM')}
                          className="w-full py-2 bg-black text-white border-2 border-black hover:bg-white hover:text-black text-xs font-bold uppercase transition-colors duration-100"
                        >
                          SIGN AS PROJECT MANAGER
                        </button>
                      )}
                    </div>

                    {/* Client Sign-off */}
                    <div className="p-4 border-2 border-black bg-white flex flex-col justify-between space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-black">CLIENT / AUDITOR</span>
                        {rfi.clientSigned ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold border border-black bg-black text-white flex items-center space-x-1 uppercase">
                            <Check className="w-3 h-3" />
                            <span>SIGNED</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold border border-neutral-400 text-neutral-500 uppercase">
                            AWAITING SIGN
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-serif text-neutral-600">
                        {rfi.clientSigned ? 'Specification approval executed.' : 'Requires regulatory review.'}
                      </div>

                      {!rfi.clientSigned && (currentUser.role === 'GUEST_AUDITOR' || currentUser.role === 'SUPER_ADMIN') && (
                        <button
                          type="button"
                          onClick={() => handleSign('CLIENT')}
                          className="w-full py-2 bg-black text-white border-2 border-black hover:bg-white hover:text-black text-xs font-bold uppercase transition-colors duration-100"
                        >
                          SIGN AS CLIENT INSPECTOR
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Closure Action */}
                  {canClose && (
                    <div className="pt-3 border-t border-black flex items-center justify-end space-x-2">
                      {status !== 'CLOSED' ? (
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('CLOSED')}
                          className="px-4 py-2 bg-black text-white border-2 border-black hover:bg-white hover:text-black text-xs font-bold uppercase transition-colors duration-100 flex items-center space-x-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>CLOSE RFI FORMALLY</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('IN_REVIEW')}
                          className="px-4 py-2 border-2 border-black bg-white text-black hover:bg-neutral-100 text-xs font-bold uppercase transition-colors duration-100"
                        >
                          RE-OPEN RFI
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'attachments' && (
            <AttachmentList
              entityType="RFI"
              entityId={rfi ? rfi.id : 'temp-rfi'}
              onPreviewImage={onPreviewImage}
              canEdit={canEditBase}
            />
          )}

          {activeTab === 'history' && rfi && (
            <div className="space-y-3 font-mono text-xs">
              <div className="text-[10px] text-neutral-500 uppercase pb-2 border-b border-black">
                AUDIT TRAIL LOG
              </div>

              <div className="space-y-3">
                {histories.map(h => (
                  <div key={h.id} className="p-3 border-2 border-black bg-white space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase text-black">{h.action}</span>
                      <span className="text-[10px] text-neutral-500">
                        {new Date(h.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-600 uppercase">
                      BY: {h.actorName}
                    </div>
                    {h.note && (
                      <p className="font-serif text-xs text-black border-t border-neutral-200 pt-1 mt-1 leading-relaxed">
                        {h.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-black font-mono text-xs">
            <div className="text-neutral-500">
              {rfi?.updatedAt && `MODIFIED: ${new Date(rfi.updatedAt).toLocaleDateString()}`}
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border-2 border-black bg-white hover:bg-neutral-100 text-black font-bold uppercase transition-colors duration-100"
              >
                CANCEL
              </button>
              {canEditBase && (
                <button
                  type="submit"
                  className="px-5 py-2 bg-black text-white border-2 border-black hover:bg-white hover:text-black font-bold uppercase transition-colors duration-100 flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isNew ? 'SUBMIT RFI' : 'SAVE CHANGES'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
