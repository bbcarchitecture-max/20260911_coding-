import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { KanbanBoard } from './components/KanbanBoard';
import { GanttChart } from './components/GanttChart';
import { RFIDashboard } from './components/RFIDashboard';
import { TaskModal } from './components/TaskModal';
import { RFIModal } from './components/RFIModal';
import { LightboxModal } from './components/LightboxModal';
import { ArchitectureInspector } from './components/ArchitectureInspector';
import { NotificationDrawer } from './components/NotificationDrawer';
import { Task, RFI } from './types';
import { apiService } from './services/apiService';
import {
  Kanban, Calendar, FileQuestion, Terminal, Shield, Plus
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'kanban' | 'gantt' | 'rfi'>('kanban');

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [targetColumnId, setTargetColumnId] = useState<string>('col-backlog');

  // RFI Modal State
  const [isRfiModalOpen, setIsRfiModalOpen] = useState(false);
  const [selectedRfi, setSelectedRfi] = useState<RFI | null>(null);

  // Lightbox State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState('');
  const [lightboxTitle, setLightboxTitle] = useState('');

  // Drawers
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const currentUser = apiService.getCurrentUser();
  const project = apiService.getProject();

  // Handlers
  const handleOpenCreateTask = (colId: string = 'col-backlog') => {
    setSelectedTask(null);
    setTargetColumnId(colId);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task?: Task, colId?: string) => {
    if (task) {
      setSelectedTask(task);
      setTargetColumnId(task.columnId);
    } else {
      setSelectedTask(null);
      setTargetColumnId(colId || 'col-backlog');
    }
    setIsTaskModalOpen(true);
  };

  const handleOpenCreateRfi = () => {
    setSelectedRfi(null);
    setIsRfiModalOpen(true);
  };

  const handleOpenEditRfi = (rfiOrId?: RFI | string) => {
    if (typeof rfiOrId === 'string') {
      const found = apiService.getRFIs().find(r => r.id === rfiOrId);
      setSelectedRfi(found || null);
    } else if (rfiOrId) {
      setSelectedRfi(rfiOrId);
    } else {
      setSelectedRfi(null);
    }
    setIsRfiModalOpen(true);
  };

  const handlePreviewImage = (imageUrl: string, fileName: string) => {
    setLightboxImage(imageUrl);
    setLightboxTitle(fileName);
    setIsLightboxOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-serif selection:bg-black selection:text-white">
      {/* Top Monochrome Header */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenCreateTask={() => handleOpenCreateTask()}
        onOpenCreateRfi={() => handleOpenCreateRfi()}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Editorial Subheader Banner */}
        {(currentView === 'kanban' || currentView === 'gantt') && (
          <div className="mb-6 pb-4 border-b-2 border-black flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-1">
                PROJECT WORK PACKAGES // {project.code}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-black">
                {currentView === 'kanban' ? 'Visual Kanban Board' : 'Timeline & Gantt Schedules'}
              </h2>
            </div>

            <div className="flex items-center space-x-3">
              <div className="border-2 border-black p-0.5 flex items-center text-xs font-mono">
                <button
                  onClick={() => setCurrentView('kanban')}
                  className={`px-3 py-1.5 uppercase tracking-wider transition-colors duration-100 flex items-center space-x-1.5 ${
                    currentView === 'kanban'
                      ? 'bg-black text-white font-bold'
                      : 'text-black hover:bg-neutral-100'
                  }`}
                >
                  <Kanban className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>BOARD</span>
                </button>

                <button
                  onClick={() => setCurrentView('gantt')}
                  className={`px-3 py-1.5 uppercase tracking-wider transition-colors duration-100 flex items-center space-x-1.5 ${
                    currentView === 'gantt'
                      ? 'bg-black text-white font-bold'
                      : 'text-black hover:bg-neutral-100'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>GANTT</span>
                </button>
              </div>

              <button
                onClick={() => handleOpenCreateTask()}
                className="px-4 py-2 bg-black text-white hover:bg-white hover:text-black border-2 border-black text-xs font-mono font-bold flex items-center space-x-1.5 uppercase tracking-widest transition-colors duration-100"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                <span>NEW WORK PACKAGE</span>
              </button>
            </div>
          </div>
        )}

        {currentView === 'kanban' && (
          <KanbanBoard
            onOpenTaskModal={handleOpenEditTask}
            onOpenRfiModal={(rfiId) => handleOpenEditRfi(rfiId)}
            onPreviewImage={handlePreviewImage}
          />
        )}

        {currentView === 'gantt' && (
          <GanttChart
            onOpenTaskModal={handleOpenEditTask}
            onOpenRfiModal={(rfiId) => handleOpenEditRfi(rfiId)}
            onSwitchView={(view) => setCurrentView(view)}
          />
        )}

        {currentView === 'rfi' && (
          <RFIDashboard
            onOpenRfiModal={(rfi) => handleOpenEditRfi(rfi)}
          />
        )}
      </main>

      {/* Bottom Engineering Status & Architecture Bar (Minimalist Monochrome) */}
      <footer className="bg-white border-t-2 border-black py-3 px-4 text-xs font-mono text-neutral-600 select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-3 text-[11px] tracking-wider">
            <span className="flex items-center space-x-1 font-bold text-black uppercase">
              <span className="w-1.5 h-1.5 bg-black inline-block"></span>
              <span>WS ONLINE</span>
            </span>
            <span>/</span>
            <span>S3 PRE-SIGNED STORAGE</span>
            <span>/</span>
            <span>LEXORANK ORDERING</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <Shield className="w-3.5 h-3.5 text-black" strokeWidth={1.5} />
              <span>ROLE: <strong className="text-black font-bold uppercase">{currentUser.role}</strong></span>
            </span>

            <button
              type="button"
              onClick={() => setIsArchitectureOpen(true)}
              className="text-black hover:underline font-bold uppercase tracking-wider flex items-center space-x-1"
            >
              <Terminal className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>SRS SPEC & API LOGS →</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={selectedTask}
        defaultColumnId={targetColumnId}
        onSave={() => setIsTaskModalOpen(false)}
        onPreviewImage={handlePreviewImage}
        onOpenRfi={(rfiId) => handleOpenEditRfi(rfiId)}
      />

      <RFIModal
        isOpen={isRfiModalOpen}
        onClose={() => setIsRfiModalOpen(false)}
        rfi={selectedRfi}
        onSave={() => setIsRfiModalOpen(false)}
        onPreviewImage={handlePreviewImage}
      />

      <LightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        imageUrl={lightboxImage}
        fileName={lightboxTitle}
      />

      <ArchitectureInspector
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onOpenTask={(taskId) => {
          const t = apiService.getTasks().find(item => item.id === taskId);
          if (t) handleOpenEditTask(t);
        }}
        onOpenRfi={(rfiId) => handleOpenEditRfi(rfiId)}
      />
    </div>
  );
}
