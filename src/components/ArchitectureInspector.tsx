import React, { useState, useEffect } from 'react';
import {
  X, Database, Network, Terminal, Trash2, CheckCircle2,
  Code2, ExternalLink, RefreshCw, ArrowRight, Server, Shield
} from 'lucide-react';
import { apiService, subscribeToChanges } from '../services/apiService';
import { ApiLog } from '../types';

interface ArchitectureInspectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureInspector: React.FC<ArchitectureInspectorProps> = ({
  isOpen,
  onClose
}) => {
  const [logs, setLogs] = useState<ApiLog[]>(apiService.getApiLogs());
  const [activeTab, setActiveTab] = useState<'api_logs' | 'architecture' | 'erd' | 'lexorank'>('api_logs');
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);

  useEffect(() => {
    const unsub = subscribeToChanges(() => {
      setLogs(apiService.getApiLogs());
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  return (
    <div
      id="architecture-inspector-backdrop"
      className="fixed inset-0 z-50 bg-black/60 flex justify-end"
      onClick={onClose}
    >
      <div
        id="architecture-inspector-drawer"
        className="w-full max-w-3xl bg-white text-black h-full flex flex-col border-l-2 border-black"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b-2 border-black flex items-center justify-between bg-neutral-100">
          <div>
            <h3 className="text-sm font-display font-bold uppercase tracking-tight text-black flex items-center space-x-2">
              <span>SYSTEM ARCHITECTURE & DISPATCH AUDIT</span>
            </h3>
            <p className="text-[11px] font-mono text-neutral-600 mt-0.5 uppercase">
              DECOUPLED REST / S3 PRE-SIGNED PIPELINE / LEXORANK REORDERING
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 border border-black hover:bg-black hover:text-white transition-colors duration-100"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-4 pt-2 border-b-2 border-black bg-neutral-50 text-xs font-mono">
          <button
            onClick={() => setActiveTab('api_logs')}
            className={`px-3 py-2 uppercase font-bold border-b-2 transition-colors duration-100 flex items-center space-x-1.5 ${
              activeTab === 'api_logs'
                ? 'border-black text-black bg-white'
                : 'border-transparent text-neutral-500 hover:text-black'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" strokeWidth={2} />
            <span>API TRAFFIC ({logs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-2 uppercase font-bold border-b-2 transition-colors duration-100 flex items-center space-x-1.5 ${
              activeTab === 'architecture'
                ? 'border-black text-black bg-white'
                : 'border-transparent text-neutral-500 hover:text-black'
            }`}
          >
            <Network className="w-3.5 h-3.5" strokeWidth={2} />
            <span>TOPOLOGY</span>
          </button>
          <button
            onClick={() => setActiveTab('erd')}
            className={`px-3 py-2 uppercase font-bold border-b-2 transition-colors duration-100 flex items-center space-x-1.5 ${
              activeTab === 'erd'
                ? 'border-black text-black bg-white'
                : 'border-transparent text-neutral-500 hover:text-black'
            }`}
          >
            <Database className="w-3.5 h-3.5" strokeWidth={2} />
            <span>SCHEMA / ERD</span>
          </button>
          <button
            onClick={() => setActiveTab('lexorank')}
            className={`px-3 py-2 uppercase font-bold border-b-2 transition-colors duration-100 flex items-center space-x-1.5 ${
              activeTab === 'lexorank'
                ? 'border-black text-black bg-white'
                : 'border-transparent text-neutral-500 hover:text-black'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" strokeWidth={2} />
            <span>LEXORANK PROOF</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 font-mono text-xs">
          {/* TAB 1: API Traffic Logs */}
          {activeTab === 'api_logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-black">
                <span className="text-[10px] uppercase font-bold text-neutral-500">
                  REAL-TIME DISPATCH TRACE
                </span>
                <button
                  onClick={() => {
                    apiService.clearApiLogs();
                    setLogs([]);
                    setSelectedLog(null);
                  }}
                  className="px-2 py-1 border border-black hover:bg-black hover:text-white uppercase text-[10px] font-bold transition-colors duration-100 flex items-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>CLEAR TRACE</span>
                </button>
              </div>

              <div className="space-y-2">
                {logs.length === 0 ? (
                  <div className="text-center py-12 text-neutral-400 uppercase">
                    NO DISPATCH CALLS RECORDED
                  </div>
                ) : (
                  logs.map(log => {
                    const isSelected = selectedLog?.id === log.id;
                    const methodClass =
                      log.method === 'GET'
                        ? 'border border-black bg-white text-black'
                        : log.method === 'POST'
                        ? 'border border-black bg-black text-white'
                        : log.method === 'PUT' || log.method === 'PATCH'
                        ? 'border-2 border-black bg-neutral-200 text-black'
                        : 'border border-black bg-neutral-100 text-neutral-700';

                    return (
                      <div
                        key={log.id}
                        onClick={() => setSelectedLog(isSelected ? null : log)}
                        className={`p-3 border-2 transition-colors duration-100 cursor-pointer ${
                          isSelected ? 'border-black bg-neutral-100' : 'border-black bg-white hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`px-1.5 py-0.5 text-[10px] font-bold ${methodClass}`}>
                              {log.method}
                            </span>
                            <span className="font-bold text-black">{log.endpoint}</span>
                          </div>
                          <div className="flex items-center space-x-3 text-[10px] text-neutral-500">
                            <span className="border border-black px-1 font-bold text-black">{log.statusCode}</span>
                            <span>{log.durationMs}ms</span>
                            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        {isSelected && log.payload && (
                          <div className="mt-3 pt-2 border-t border-black space-y-1">
                            <div className="text-[10px] font-bold text-neutral-500 uppercase">PAYLOAD:</div>
                            <pre className="p-2 border border-black bg-white text-[11px] overflow-x-auto">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Topology */}
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="p-4 border-2 border-black bg-neutral-100">
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
                  DECOUPLED ARCHITECTURAL BLUEPRINT
                </div>
                <div className="font-serif text-sm font-bold">
                  CLIENT SPA ── (REST/WSS) ──&gt; API GATEWAY ──&gt; POSTGRESQL &amp; S3
                </div>
              </div>

              <div className="border-2 border-black p-4 space-y-3 bg-white">
                <div className="font-serif font-bold text-sm uppercase">1. REST API GATEWAY &amp; WEBSOCKET BUS</div>
                <p className="font-serif text-xs text-neutral-700 leading-relaxed">
                  Single-Page Application decoupling enables distinct scaling. Task modifications broadcast event packets over persistent WebSocket multiplexing to synchronize concurrent engineer views.
                </p>
              </div>

              <div className="border-2 border-black p-4 space-y-3 bg-white">
                <div className="font-serif font-bold text-sm uppercase">2. DIRECT S3 PRE-SIGNED STORAGE</div>
                <p className="font-serif text-xs text-neutral-700 leading-relaxed">
                  Bypasses API server memory overhead. The client fetches a signed authorization token, streams binary CAD and image blobs directly to S3 via HTTP PUT, and commits metadata via completion hooks.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: ERD */}
          {activeTab === 'erd' && (
            <div className="space-y-4">
              <div className="border-2 border-black p-4 bg-white">
                <div className="font-serif font-bold text-sm uppercase mb-2">RELATIONAL DATA SCHEMA DEFINITIONS</div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 border border-black bg-neutral-50">
                    <span className="font-bold">tasks</span>: id (UUID), project_id, column_id, title, lexorank (VARCHAR), progress (INT), priority, start_date, due_date
                  </div>
                  <div className="p-2 border border-black bg-neutral-50">
                    <span className="font-bold">rfis</span>: id (UUID), rfi_code (UNIQUE), subject, question, cost_impact, cost_amount, schedule_impact, status
                  </div>
                  <div className="p-2 border border-black bg-neutral-50">
                    <span className="font-bold">attachments</span>: id, entity_type, entity_id, file_name, file_size, storage_key, file_url
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Lexorank Proof */}
          {activeTab === 'lexorank' && (
            <div className="space-y-4">
              <div className="border-2 border-black p-4 bg-white space-y-2">
                <div className="font-serif font-bold text-sm uppercase">LEXORANK ORDERING DEMONSTRATION</div>
                <p className="font-serif text-xs text-neutral-700 leading-relaxed">
                  Cards employ Jira/OpenProject style fractional alphanumeric string ranks (Base36 midpoint calculation). Reordering updates only the displaced card with O(1) database impact rather than recalculating integer arrays across entire column collections.
                </p>
                <div className="p-3 border border-black bg-neutral-100 font-mono text-[11px]">
                  PREV: "0|hzzzzz:" <br />
                  NEXT: "0|i00003:" <br />
                  CALCULATED MIDPOINT: "0|hzzzzu:" (ZERO ARRAY SHIFT)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
