import React, { useState } from 'react';
import {
  Plus, Search, Filter, Clock, DollarSign, FileCheck2,
  ChevronRight, Calendar, ArrowUpDown
} from 'lucide-react';
import { RFI, RFIStatus } from '../types';
import { apiService } from '../services/apiService';

interface RFIDashboardProps {
  onOpenRfiModal: (rfi?: RFI) => void;
}

export const RFIDashboard: React.FC<RFIDashboardProps> = ({ onOpenRfiModal }) => {
  const [rfis, setRfis] = useState<RFI[]>(apiService.getRFIs());
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [costFilter, setCostFilter] = useState<string>('ALL');
  const users = apiService.getUsers();
  const currentUser = apiService.getCurrentUser();

  // Metrics
  const totalRfis = rfis.length;
  const pendingRfis = rfis.filter(r => r.status === 'SUBMITTED' || r.status === 'IN_REVIEW').length;
  const answeredRfis = rfis.filter(r => r.status === 'ANSWERED').length;
  const closedRfis = rfis.filter(r => r.status === 'CLOSED').length;
  const totalCostImpact = rfis.reduce((sum, r) => sum + (r.costAmount || 0), 0);
  const totalScheduleImpact = rfis.reduce((sum, r) => sum + (r.scheduleImpact || 0), 0);

  const filteredRfis = rfis.filter(r => {
    const matchesSearch =
      r.rfiCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.question.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesCost =
      costFilter === 'ALL' ||
      (costFilter === 'COST' && r.costImpact) ||
      (costFilter === 'SCHEDULE' && r.scheduleImpact > 0);

    return matchesSearch && matchesStatus && matchesCost;
  });

  const getStatusBadge = (status: RFIStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="px-2 py-0.5 font-mono text-[10px] uppercase border border-neutral-400 text-neutral-600">
            DRAFT
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="px-2 py-0.5 font-mono text-[10px] uppercase border border-black bg-neutral-100 text-black font-bold">
            SUBMITTED
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="px-2 py-0.5 font-mono text-[10px] uppercase border-2 border-black text-black font-bold">
            IN REVIEW
          </span>
        );
      case 'ANSWERED':
        return (
          <span className="px-2 py-0.5 font-mono text-[10px] uppercase border-2 border-black bg-black text-white font-bold tracking-wider">
            ANSWERED
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2 py-0.5 font-mono text-[10px] uppercase border border-black text-black bg-neutral-100">
            CLOSED ✓
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-0.5 font-mono text-[10px] uppercase border border-black bg-neutral-200 line-through">
            REJECTED
          </span>
        );
    }
  };

  const kanbanColumns: { status: RFIStatus; title: string }[] = [
    { status: 'SUBMITTED', title: 'SUBMITTED' },
    { status: 'IN_REVIEW', title: 'IN REVIEW' },
    { status: 'ANSWERED', title: 'ANSWERED' },
    { status: 'CLOSED', title: 'CLOSED' }
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 border-2 border-black">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">TOTAL RFIS</div>
          <div className="text-2xl font-serif font-bold text-black mt-1">
            {totalRfis} <span className="text-xs font-mono font-normal text-neutral-500">ITEMS</span>
          </div>
          <div className="text-[10px] font-mono text-neutral-400 mt-1">SEQUENTIAL NUMBERING</div>
        </div>

        <div className="bg-white p-4 border-2 border-black">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex items-center justify-between">
            <span>PENDING / IN REVIEW</span>
            <Clock className="w-3.5 h-3.5 text-black" strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-serif font-bold text-black mt-1">
            {pendingRfis} <span className="text-xs font-mono font-normal text-neutral-500">ITEMS</span>
          </div>
          <div className="text-[10px] font-mono text-neutral-500 mt-1">AWAITING PE / PM SIGN</div>
        </div>

        <div className="bg-white p-4 border-2 border-black">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex items-center justify-between">
            <span>ANSWERED (FORMAL)</span>
            <FileCheck2 className="w-3.5 h-3.5 text-black" strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-serif font-bold text-black mt-1">
            {answeredRfis} <span className="text-xs font-mono font-normal text-neutral-500">ITEMS</span>
          </div>
          <div className="text-[10px] font-mono text-neutral-500 mt-1">OFFICIAL RESPONSE ISSUED</div>
        </div>

        <div className="bg-white p-4 border-2 border-black">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex items-center justify-between">
            <span>COST IMPACT (ACCUM.)</span>
            <DollarSign className="w-3.5 h-3.5 text-black" strokeWidth={1.5} />
          </div>
          <div className="text-xl font-mono font-bold text-black mt-1">
            ${totalCostImpact.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-neutral-500 mt-1">VERIFIED VARIATION</div>
        </div>

        <div className="bg-white p-4 border-2 border-black col-span-2 sm:col-span-1">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex items-center justify-between">
            <span>SCHEDULE IMPACT</span>
            <Calendar className="w-3.5 h-3.5 text-black" strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-mono font-bold text-black mt-1">
            +{totalScheduleImpact} <span className="text-xs font-mono font-normal text-neutral-500">DAYS</span>
          </div>
          <div className="text-[10px] font-mono text-neutral-500 mt-1">CRITICAL PATH ESTIMATE</div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border-2 border-black">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-black absolute left-3 top-2.5" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="SEARCH CODE (E.G. RFI-0041), SUBJECT..."
              className="w-full pl-9 pr-3 py-1.5 border-2 border-black text-xs font-mono uppercase placeholder:text-neutral-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border-2 border-black text-xs font-mono uppercase bg-white cursor-pointer focus:outline-none"
          >
            <option value="ALL">ALL STATUSES</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="IN_REVIEW">IN REVIEW</option>
            <option value="ANSWERED">ANSWERED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          {/* Impact Filter */}
          <select
            value={costFilter}
            onChange={e => setCostFilter(e.target.value)}
            className="px-2.5 py-1.5 border-2 border-black text-xs font-mono uppercase bg-white cursor-pointer focus:outline-none"
          >
            <option value="ALL">IMPACT: ALL</option>
            <option value="COST">COST VARIATION ONLY</option>
            <option value="SCHEDULE">SCHEDULE IMPACT ONLY</option>
          </select>

          {/* View Switcher: Table vs Dedicated RFI Kanban */}
          <div className="flex items-center border-2 border-black p-0.5 text-xs font-mono">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 uppercase font-bold transition-colors duration-100 ${
                viewMode === 'table' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'
              }`}
            >
              TABLE
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 uppercase font-bold transition-colors duration-100 ${
                viewMode === 'kanban' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'
              }`}
            >
              KANBAN
            </button>
          </div>

          {/* Create Button */}
          <button
            onClick={() => onOpenRfiModal()}
            className="px-3.5 py-1.5 bg-black text-white hover:bg-white hover:text-black border-2 border-black text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors duration-100 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            <span>NEW RFI</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'table' ? (
        <div className="bg-white border-2 border-black overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-100 text-black font-mono font-bold uppercase tracking-wider border-b-2 border-black text-[11px]">
                  <th className="py-3 px-4">RFI CODE</th>
                  <th className="py-3 px-4">SUBJECT / QUERY</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">SCHEDULE</th>
                  <th className="py-3 px-4">COST IMPACT</th>
                  <th className="py-3 px-4">REQUESTER → ASSIGNED</th>
                  <th className="py-3 px-4">DUE DATE</th>
                  <th className="py-3 px-4 text-center">SIGNATURES</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/15 font-serif">
                {filteredRfis.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-neutral-500 font-mono">
                      NO REQUEST FOR INFORMATION (RFI) FOUND
                    </td>
                  </tr>
                ) : (
                  filteredRfis.map(rfi => {
                    const reqUser = users.find(u => u.id === rfi.requestedBy);
                    const respUser = users.find(u => u.id === rfi.assignedTo);

                    return (
                      <tr
                        key={rfi.id}
                        onClick={() => onOpenRfiModal(rfi)}
                        className="hover:bg-neutral-100 cursor-pointer transition-colors duration-100 group"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-black border-b border-black">
                          {rfi.rfiCode}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-black group-hover:underline max-w-sm truncate text-sm">
                            {rfi.subject}
                          </div>
                          <div className="text-[11px] text-neutral-600 truncate max-w-xs mt-0.5">
                            {rfi.question.replace(/###/g, '').substring(0, 60)}...
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(rfi.status)}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {rfi.scheduleImpact > 0 ? (
                            <span className="font-bold border border-black px-1.5 py-0.5 bg-neutral-100">
                              +{rfi.scheduleImpact} DAYS
                            </span>
                          ) : (
                            <span className="text-neutral-400">0d</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {rfi.costImpact && rfi.costAmount ? (
                            <span className="font-bold border border-black px-1.5 py-0.5 bg-black text-white">
                              ${rfi.costAmount.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <div className="font-bold text-black">
                            {reqUser?.name.toUpperCase() || 'ENGINEER'}
                          </div>
                          <div className="text-neutral-500">
                            → {respUser?.name.toUpperCase() || 'UNASSIGNED'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-neutral-700">
                          {rfi.dueDate}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-[10px]">
                          <div className="flex items-center justify-center space-x-1">
                            <span
                              className={`px-1.5 py-0.5 border ${
                                rfi.pmSigned ? 'border-black bg-black text-white font-bold' : 'border-neutral-300 text-neutral-400'
                              }`}
                            >
                              PM {rfi.pmSigned ? '✓' : '—'}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 border ${
                                rfi.clientSigned ? 'border-black bg-black text-white font-bold' : 'border-neutral-300 text-neutral-400'
                              }`}
                            >
                              CLIENT {rfi.clientSigned ? '✓' : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            className="p-1 border border-black hover:bg-black hover:text-white transition-colors duration-100"
                          >
                            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Dedicated RFI Stage Kanban */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kanbanColumns.map(col => {
            const colRfis = filteredRfis.filter(r => r.status === col.status);
            return (
              <div
                key={col.status}
                className="bg-white p-3.5 border-2 border-black flex flex-col min-h-[480px]"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-black">
                  <span className="font-display font-bold text-xs uppercase tracking-tight text-black">{col.title}</span>
                  <span className="font-mono text-xs px-1.5 py-0.2 border border-black bg-neutral-100 font-bold">
                    {colRfis.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colRfis.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-neutral-300 flex items-center justify-center text-xs font-mono text-neutral-400">
                      NO RFIS
                    </div>
                  ) : (
                    colRfis.map(rfi => (
                      <div
                        key={rfi.id}
                        onClick={() => onOpenRfiModal(rfi)}
                        className="bg-white p-3.5 border border-black hover:border-2 hover:bg-neutral-50 transition-all duration-100 cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="font-bold text-black border-b border-black">{rfi.rfiCode}</span>
                          <span className="text-neutral-500">{rfi.dueDate}</span>
                        </div>

                        <h4 className="font-serif font-bold text-sm text-black group-hover:underline line-clamp-2">
                          {rfi.subject}
                        </h4>

                        {(rfi.costImpact || rfi.scheduleImpact > 0) && (
                          <div className="flex items-center gap-1.5 flex-wrap font-mono text-[10px]">
                            {rfi.costImpact && (
                              <span className="border border-black px-1.5 py-0.5 bg-black text-white font-bold">
                                +${rfi.costAmount?.toLocaleString()}
                              </span>
                            )}
                            {rfi.scheduleImpact > 0 && (
                              <span className="border border-black px-1.5 py-0.5 font-bold">
                                +{rfi.scheduleImpact} DAYS
                              </span>
                            )}
                          </div>
                        )}

                        <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[11px] font-mono text-neutral-600">
                          <span className="truncate max-w-[140px]">
                            RESP: {users.find(u => u.id === rfi.assignedTo)?.name.toUpperCase()}
                          </span>
                          <div className="flex items-center space-x-1">
                            {rfi.pmSigned && <span className="text-[9px] border border-black px-1 font-bold">PM</span>}
                            {rfi.clientSigned && <span className="text-[9px] border border-black bg-black text-white px-1 font-bold">CL</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
