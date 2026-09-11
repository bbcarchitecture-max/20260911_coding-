import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Search, Plus, Filter, Clock, Link2, Diamond, ArrowRight,
  Maximize2, Minimize2, Info, Layers, CheckCircle2,
  AlertTriangle, Folder, FileText, CornerDownRight, MoreHorizontal,
  Kanban, FileQuestion, ArrowLeft
} from 'lucide-react';
import { Task, Column, User, Priority, RFI, WorkPackageType } from '../types';
import { apiService, subscribeToChanges } from '../services/apiService';

interface GanttChartProps {
  onOpenTaskModal: (task?: Task) => void;
  onOpenRfiModal: (rfiId: string) => void;
  onSwitchView?: (view: 'kanban' | 'gantt' | 'rfi') => void;
}

type TimeScale = 'DAYS' | 'WEEKS' | 'MONTHS';

export const GanttChart: React.FC<GanttChartProps> = ({
  onOpenTaskModal,
  onOpenRfiModal,
  onSwitchView
}) => {
  const [tasks, setTasks] = useState<Task[]>(apiService.getTasks());
  const [columns, setColumns] = useState<Column[]>(apiService.getColumns());
  const [users, setUsers] = useState<User[]>(apiService.getUsers());
  const [rfis, setRfis] = useState<RFI[]>(apiService.getRFIs());
  const currentUser = apiService.getCurrentUser();

  // Sidebar Navigation State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [activeFilterView, setActiveFilterView] = useState<'ALL_OPEN' | 'PROJECT_PLAN' | 'MILESTONES' | 'MY_WP'>('ALL_OPEN');
  const [favoriteOpen, setFavoriteOpen] = useState(true);
  const [defaultOpen, setDefaultOpen] = useState(true);

  // Hierarchy expand / collapse state
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({
    'phase-1': true,
    'phase-2': true,
    'phase-3': true
  });

  // Gantt Controls
  const [timeScale, setTimeScale] = useState<TimeScale>('DAYS');
  const [showDependencies, setShowDependencies] = useState(true);
  const [showInfoPane, setShowInfoPane] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Drag / Resize state
  const [dragState, setDragState] = useState<{
    taskId: string;
    action: 'MOVE' | 'RESIZE_START' | 'RESIZE_END';
    initialMouseX: number;
    initialStartDate: string;
    initialDueDate: string;
  } | null>(null);

  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToChanges(() => {
      setTasks(apiService.getTasks());
      setColumns(apiService.getColumns());
      setUsers(apiService.getUsers());
      setRfis(apiService.getRFIs());
    });
    return unsub;
  }, []);

  const toggleExpand = (parentId: string) => {
    setExpandedParents(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // 1. Calculate Timeline Date Range
  const { timelineStart, timelineEnd, totalDays, datesArray } = useMemo(() => {
    let minDate = new Date('2026-08-30');
    let maxDate = new Date('2026-10-15');

    tasks.forEach(t => {
      if (t.startDate) {
        const s = new Date(t.startDate);
        if (s < minDate) minDate = s;
      }
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        if (d > maxDate) maxDate = d;
      }
    });

    const start = new Date(minDate);
    start.setDate(start.getDate() - 3);
    const end = new Date(maxDate);
    end.setDate(end.getDate() + 7);

    const days: Date[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: days.length,
      datesArray: days
    };
  }, [tasks]);

  const dayWidth = timeScale === 'DAYS' ? 36 : timeScale === 'WEEKS' ? 22 : 12;

  const getDayOffset = (dateStr: string) => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    const diff = Math.floor((d.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  // Today marker
  const todayDateStr = '2026-09-10';
  const todayOffset = getDayOffset(todayDateStr);
  const todayLeftPixel = todayOffset * dayWidth + dayWidth / 2;

  const handleJumpToToday = () => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollTo({
        left: Math.max(0, todayLeftPixel - 300),
        behavior: 'smooth'
      });
    }
  };

  // Hierarchy Work Packages calculation
  const visibleTasks = useMemo(() => {
    let list = tasks;

    if (sidebarSearch.trim()) {
      const q = sidebarSearch.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || (t.moduleName && t.moduleName.toLowerCase().includes(q)));
    }

    if (activeFilterView === 'MILESTONES') {
      list = list.filter(t => t.wpType === 'MILESTONE' || t.isMilestone);
    } else if (activeFilterView === 'MY_WP') {
      list = list.filter(t => t.assigneeId === currentUser.id);
    }

    const phases = list.filter(t => t.wpType === 'PHASE');
    const result: Array<{
      task: Task;
      level: number;
      hasChildren: boolean;
      isExpanded: boolean;
    }> = [];

    phases.forEach(phase => {
      const isExpanded = expandedParents[phase.id] !== false;
      const children = list.filter(t => t.parentId === phase.id);

      result.push({
        task: phase,
        level: 0,
        hasChildren: children.length > 0,
        isExpanded
      });

      if (isExpanded) {
        children.forEach(child => {
          result.push({
            task: child,
            level: 1,
            hasChildren: false,
            isExpanded: true
          });
        });
      }
    });

    const standalones = list.filter(t => t.wpType !== 'PHASE' && (!t.parentId || !phases.some(p => p.id === t.parentId)));
    standalones.forEach(task => {
      result.push({
        task,
        level: 0,
        hasChildren: false,
        isExpanded: true
      });
    });

    return result;
  }, [tasks, sidebarSearch, activeFilterView, currentUser.id, expandedParents]);

  // Drag and Resize Handlers
  const handleMouseDown = (
    e: React.MouseEvent,
    taskId: string,
    action: 'MOVE' | 'RESIZE_START' | 'RESIZE_END'
  ) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setDragState({
      taskId,
      action,
      initialMouseX: e.clientX,
      initialStartDate: task.startDate || task.dueDate,
      initialDueDate: task.dueDate
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState) return;

      const deltaX = e.clientX - dragState.initialMouseX;
      const daysDelta = Math.round(deltaX / dayWidth);

      if (daysDelta === 0) return;

      const task = tasks.find(t => t.id === dragState.taskId);
      if (!task) return;

      const s = new Date(dragState.initialStartDate);
      const d = new Date(dragState.initialDueDate);

      if (dragState.action === 'MOVE') {
        s.setDate(s.getDate() + daysDelta);
        d.setDate(d.getDate() + daysDelta);
        const newStart = s.toISOString().split('T')[0];
        const newDue = d.toISOString().split('T')[0];
        apiService.updateTask(task.id, { startDate: newStart, dueDate: newDue });
      } else if (dragState.action === 'RESIZE_START') {
        s.setDate(s.getDate() + daysDelta);
        if (s <= d) {
          const newStart = s.toISOString().split('T')[0];
          apiService.updateTask(task.id, { startDate: newStart });
        }
      } else if (dragState.action === 'RESIZE_END') {
        d.setDate(d.getDate() + daysDelta);
        if (d >= s) {
          const newDue = d.toISOString().split('T')[0];
          apiService.updateTask(task.id, { dueDate: newDue });
        }
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, dayWidth, tasks]);

  const formatMonoDate = (isoStr: string) => {
    if (!isoStr) return '';
    const parts = isoStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return isoStr;
  };

  return (
    <div className="flex h-[calc(100vh-130px)] min-h-[640px] bg-white border-2 border-black overflow-hidden text-black font-serif select-none">
      {/* 1. Left Project Navigation Sidebar (Minimalist Monochrome Inverted Black) */}
      <div
        className={`bg-black text-white transition-all duration-100 flex flex-col shrink-0 border-r-2 border-black ${
          isSidebarOpen ? 'w-60' : 'w-12'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-12 border-b border-white/30 px-3 flex items-center justify-between font-mono">
          {isSidebarOpen ? (
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-white">
              <button
                onClick={() => onSwitchView?.('kanban')}
                className="hover:underline p-1 flex items-center space-x-1"
                title="Return to Board"
              >
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <span className="truncate">GANTT TIMELINE</span>
            </div>
          ) : (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1 hover:text-white text-neutral-400 mx-auto"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          )}

          {isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 text-neutral-400 hover:text-white"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>

        {isSidebarOpen && (
          <div className="flex-1 overflow-y-auto py-3 text-xs">
            {/* Search by name */}
            <div className="px-3 mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={sidebarSearch}
                  onChange={e => setSidebarSearch(e.target.value)}
                  placeholder="SEARCH BY NAME..."
                  className="w-full pl-7 pr-2 py-1.5 bg-black border border-white/40 text-xs font-mono text-white placeholder:text-neutral-500 focus:outline-none focus:border-white"
                />
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2 top-2" strokeWidth={1.5} />
              </div>
            </div>

            {/* VIEWS SECTION */}
            <div className="px-3 mb-4">
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-1.5 px-1">
                VIEWS
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => onSwitchView?.('gantt')}
                  className="w-full text-left px-2.5 py-1.5 flex items-center space-x-2 text-xs font-mono font-bold bg-white text-black uppercase tracking-wider"
                >
                  <CalendarIcon className="w-3.5 h-3.5" strokeWidth={2} />
                  <span>GANTT CHARTS</span>
                </button>

                <button
                  onClick={() => onSwitchView?.('kanban')}
                  className="w-full text-left px-2.5 py-1.5 flex items-center space-x-2 text-xs font-mono text-neutral-300 hover:bg-white/10 hover:text-white uppercase tracking-wider transition-colors duration-100"
                >
                  <Kanban className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>BOARDS</span>
                </button>

                <button
                  onClick={() => onSwitchView?.('rfi')}
                  className="w-full text-left px-2.5 py-1.5 flex items-center space-x-2 text-xs font-mono text-neutral-300 hover:bg-white/10 hover:text-white uppercase tracking-wider transition-colors duration-100"
                >
                  <FileQuestion className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>RFIS</span>
                </button>
              </div>
            </div>

            {/* FAVORITE SECTION */}
            <div className="px-3 mb-4">
              <button
                onClick={() => setFavoriteOpen(!favoriteOpen)}
                className="w-full flex items-center justify-between text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-1.5 px-1 hover:text-white"
              >
                <span>FAVORITE</span>
                {favoriteOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {favoriteOpen && (
                <div className="space-y-1 font-mono text-xs">
                  <button
                    onClick={() => setActiveFilterView('PROJECT_PLAN')}
                    className={`w-full text-left px-2.5 py-1.5 flex items-center space-x-2 uppercase tracking-wider transition-colors duration-100 ${
                      activeFilterView === 'PROJECT_PLAN'
                        ? 'bg-neutral-800 text-white font-bold border-l-2 border-white'
                        : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>PROJECT PLAN</span>
                  </button>
                  <button
                    onClick={() => setActiveFilterView('MILESTONES')}
                    className={`w-full text-left px-2.5 py-1.5 flex items-center space-x-2 uppercase tracking-wider transition-colors duration-100 ${
                      activeFilterView === 'MILESTONES'
                        ? 'bg-neutral-800 text-white font-bold border-l-2 border-white'
                        : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Diamond className="w-3 h-3 text-white fill-white" />
                    <span>MILESTONES</span>
                  </button>
                </div>
              )}
            </div>

            {/* DEFAULT SECTION */}
            <div className="px-3 mb-4">
              <button
                onClick={() => setDefaultOpen(!defaultOpen)}
                className="w-full flex items-center justify-between text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-1.5 px-1 hover:text-white"
              >
                <span>DEFAULT</span>
                {defaultOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {defaultOpen && (
                <div className="space-y-1 font-mono text-xs">
                  <button
                    onClick={() => setActiveFilterView('ALL_OPEN')}
                    className={`w-full text-left px-2.5 py-1.5 flex items-center space-x-2 uppercase tracking-wider transition-colors duration-100 ${
                      activeFilterView === 'ALL_OPEN'
                        ? 'bg-neutral-800 text-white font-bold border-l-2 border-white'
                        : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>ALL OPEN</span>
                  </button>
                  <button
                    onClick={() => setActiveFilterView('MY_WP')}
                    className={`w-full text-left px-2.5 py-1.5 flex items-center space-x-2 uppercase tracking-wider transition-colors duration-100 ${
                      activeFilterView === 'MY_WP'
                        ? 'bg-neutral-800 text-white font-bold border-l-2 border-white'
                        : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>MY WORK PACKAGES</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Action Bar */}
        <div className="h-12 border-b-2 border-black bg-white px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0">
          {/* Left Action Controls */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-black font-display font-bold text-sm tracking-tight uppercase">
              <CalendarIcon className="w-4 h-4 text-black" strokeWidth={2} />
              <span>
                {activeFilterView === 'ALL_OPEN'
                  ? 'ALL OPEN'
                  : activeFilterView === 'MILESTONES'
                  ? 'MILESTONES'
                  : activeFilterView === 'MY_WP'
                  ? 'MY WORK PACKAGES'
                  : 'PROJECT PLAN'}
              </span>
            </div>

            {/* Create Button */}
            <button
              onClick={() => onOpenTaskModal()}
              className="px-3 py-1.5 bg-black text-white hover:bg-white hover:text-black border-2 border-black font-mono font-bold text-xs uppercase tracking-wider flex items-center space-x-1 transition-colors duration-100"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              <span>CREATE</span>
              <ChevronDown className="w-3 h-3" strokeWidth={2} />
            </button>

            {/* Filter Pills */}
            <div className="hidden lg:flex items-center space-x-2 text-xs font-mono">
              <button className="px-2.5 py-1 border-2 border-black hover:bg-black hover:text-white uppercase flex items-center space-x-1 transition-colors duration-100">
                <span>PROJECTS</span>
                <span className="font-bold border border-current px-1 text-[10px]">1</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              <button className="px-2.5 py-1 border-2 border-black hover:bg-black hover:text-white uppercase flex items-center space-x-1 transition-colors duration-100">
                <span>BASELINE</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              <button className="px-2.5 py-1 border-2 border-black hover:bg-black hover:text-white uppercase flex items-center space-x-1 transition-colors duration-100">
                <Filter className="w-3 h-3" strokeWidth={1.5} />
                <span>FILTER</span>
                <span className="font-bold border border-current px-1 text-[10px]">1</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2">
            {/* Time Scale switcher */}
            <div className="flex items-center border-2 border-black p-0.5 text-xs font-mono">
              <button
                onClick={() => setTimeScale('DAYS')}
                className={`px-2 py-0.5 uppercase transition-colors duration-100 text-[11px] ${
                  timeScale === 'DAYS' ? 'bg-black text-white font-bold' : 'text-black hover:bg-neutral-100'
                }`}
              >
                DAYS
              </button>
              <button
                onClick={() => setTimeScale('WEEKS')}
                className={`px-2 py-0.5 uppercase transition-colors duration-100 text-[11px] ${
                  timeScale === 'WEEKS' ? 'bg-black text-white font-bold' : 'text-black hover:bg-neutral-100'
                }`}
              >
                WEEKS
              </button>
              <button
                onClick={() => setTimeScale('MONTHS')}
                className={`px-2 py-0.5 uppercase transition-colors duration-100 text-[11px] ${
                  timeScale === 'MONTHS' ? 'bg-black text-white font-bold' : 'text-black hover:bg-neutral-100'
                }`}
              >
                MONTHS
              </button>
            </div>

            {/* Jump to Today */}
            <button
              onClick={handleJumpToToday}
              className="px-2.5 py-1 bg-white hover:bg-black hover:text-white text-black border-2 border-black font-mono font-bold text-xs uppercase flex items-center space-x-1 transition-colors duration-100"
            >
              <Clock className="w-3 h-3" strokeWidth={2} />
              <span className="hidden sm:inline">TODAY</span>
            </button>

            {/* Dependency lines toggle */}
            <button
              onClick={() => setShowDependencies(!showDependencies)}
              className={`p-1.5 border-2 border-black transition-colors duration-100 ${
                showDependencies
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
              title="Toggle Dependency Lines"
            >
              <Link2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>

            {/* Info Drawer Toggle */}
            <button
              onClick={() => setShowInfoPane(!showInfoPane)}
              className={`p-1.5 border-2 border-black transition-colors duration-100 ${
                showInfoPane
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
              title="Details Pane"
            >
              <Info className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Dual Pane Work Area: Left Table + Right Timeline Canvas */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Work Packages Table */}
          <div className="w-[360px] sm:w-[420px] lg:w-[460px] shrink-0 border-r-2 border-black flex flex-col bg-white">
            {/* Table Header */}
            <div className="h-10 border-b-2 border-black bg-neutral-100 flex items-center px-3 text-[11px] font-mono font-bold uppercase tracking-widest text-black select-none shrink-0">
              <div className="w-12">ID</div>
              <div className="w-24">TYPE</div>
              <div className="flex-1 pl-1 flex items-center space-x-1">
                <span>SUBJECT</span>
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>

            {/* Table Body */}
            <div
              ref={tableScrollRef}
              onScroll={handleTableScroll}
              className="flex-1 overflow-y-auto divide-y divide-black/15"
            >
              {visibleTasks.map(({ task, level, hasChildren, isExpanded }, idx) => {
                const isPhase = task.wpType === 'PHASE';
                const isMilestone = task.wpType === 'MILESTONE' || task.isMilestone;
                const isHovered = hoveredTaskId === task.id;
                const isSelected = selectedTask?.id === task.id;

                return (
                  <div
                    key={task.id}
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                    onClick={() => setSelectedTask(task)}
                    onDoubleClick={() => onOpenTaskModal(task)}
                    className={`h-10 flex items-center px-3 text-xs cursor-pointer select-none transition-colors duration-100 ${
                      isSelected
                        ? 'bg-black text-white font-bold'
                        : isHovered
                        ? 'bg-neutral-100 text-black'
                        : ''
                    }`}
                  >
                    {/* ID */}
                    <div className="w-12 font-mono text-[11px]">
                      {idx + 1}
                    </div>

                    {/* TYPE Badge */}
                    <div className="w-24">
                      {isPhase ? (
                        <span className={`font-mono text-[10px] font-bold uppercase px-1 py-0.2 border ${isSelected ? 'border-white text-white' : 'border-black text-black bg-neutral-200'}`}>
                          PHASE
                        </span>
                      ) : isMilestone ? (
                        <span className={`font-mono text-[10px] font-bold uppercase px-1 py-0.2 border ${isSelected ? 'border-white text-white' : 'border-black text-black'}`}>
                          MILESTONE
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] uppercase text-neutral-500">
                          TASK
                        </span>
                      )}
                    </div>

                    {/* SUBJECT */}
                    <div
                      className="flex-1 flex items-center space-x-1.5 truncate"
                      style={{ paddingLeft: `${level * 16}px` }}
                    >
                      {hasChildren ? (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            toggleExpand(task.id);
                          }}
                          className="w-4 h-4 flex items-center justify-center hover:opacity-75"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ) : isMilestone ? (
                        <Diamond className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white fill-white' : 'text-black fill-black'}`} />
                      ) : (
                        <div className="w-4 h-4 shrink-0" />
                      )}

                      <span
                        className={`truncate font-serif ${
                          isPhase
                            ? 'font-bold'
                            : isMilestone
                            ? 'font-bold underline'
                            : 'font-normal'
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table Footer Count */}
            <div className="h-8 border-t-2 border-black bg-neutral-100 px-3 flex items-center justify-between text-[11px] text-black shrink-0 font-mono">
              <span>(1 - {visibleTasks.length}/{tasks.length})</span>
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">DOUBLE CLICK TO EDIT</span>
            </div>
          </div>

          {/* Right: Interactive Timeline Canvas */}
          <div
            ref={timelineScrollRef}
            onScroll={handleTimelineScroll}
            className="flex-1 overflow-x-auto overflow-y-auto relative bg-white select-none"
          >
            <div
              style={{ width: `${totalDays * dayWidth + 300}px` }}
              className="min-h-full flex flex-col relative"
            >
              {/* Timeline Header */}
              <div className="h-10 border-b-2 border-black bg-white sticky top-0 z-20 flex flex-col">
                {/* Year and Month Row */}
                <div className="h-5 border-b border-black/20 flex items-center px-3 text-[10px] font-mono font-bold uppercase tracking-wider bg-neutral-100 text-black">
                  <span>TIMELINE SCHEDULE // SEPT - OCT 2026</span>
                </div>

                {/* Day Header Row */}
                <div className="h-5 flex">
                  {datesArray.map((date, idx) => {
                    const dayNum = date.getDate();
                    const dayOfWeek = date.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const dateStr = date.toISOString().split('T')[0];
                    const isToday = dateStr === todayDateStr;

                    return (
                      <div
                        key={idx}
                        style={{ width: `${dayWidth}px` }}
                        className={`border-r border-black/15 flex items-center justify-center text-[10px] font-mono shrink-0 transition-colors ${
                          isToday
                            ? 'bg-black text-white font-bold'
                            : isWeekend
                            ? 'bg-neutral-100 text-neutral-400'
                            : 'text-black'
                        }`}
                      >
                        <span>{dayNum < 10 ? `0${dayNum}` : dayNum}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Vertical "Today" Marker Line */}
              <div
                style={{ left: `${todayLeftPixel}px` }}
                className="absolute top-0 bottom-0 w-0.5 bg-black z-15 pointer-events-none flex flex-col items-center"
              >
                <div className="sticky top-10 bg-black text-white font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-black -translate-x-1/2 whitespace-nowrap">
                  TODAY (09/10)
                </div>
              </div>

              {/* Grid Columns Background */}
              <div className="absolute top-10 bottom-0 left-0 right-0 flex pointer-events-none">
                {datesArray.map((date, idx) => {
                  const dayOfWeek = date.getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  return (
                    <div
                      key={idx}
                      style={{ width: `${dayWidth}px` }}
                      className={`border-r border-neutral-200 h-full shrink-0 ${
                        isWeekend ? 'bg-neutral-50' : ''
                      }`}
                    ></div>
                  );
                })}
              </div>

              {/* SVG Layer for Dependency Lines */}
              {showDependencies && (
                <svg className="absolute top-10 bottom-0 left-0 right-0 w-full h-full pointer-events-none z-10">
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 8 5 L 0 9 z" fill="#000000" />
                    </marker>
                  </defs>

                  {visibleTasks.map(({ task }, targetIdx) => {
                    if (!task.dependencies || task.dependencies.length === 0) return null;

                    return task.dependencies.map(depId => {
                      const sourceIdx = visibleTasks.findIndex(item => item.task.id === depId);
                      if (sourceIdx < 0) return null;
                      const sourceTask = visibleTasks[sourceIdx].task;

                      const sourceEndOffset = getDayOffset(sourceTask.dueDate || sourceTask.startDate || '2026-09-10');
                      const targetStartOffset = getDayOffset(task.startDate || task.dueDate || '2026-09-10');

                      const startX = (sourceEndOffset + 1) * dayWidth;
                      const startY = sourceIdx * 40 + 20;
                      const endX = targetStartOffset * dayWidth;
                      const endY = targetIdx * 40 + 20;

                      const midX = startX + 12;
                      const pathData = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;

                      return (
                        <path
                          key={`${depId}->${task.id}`}
                          d={pathData}
                          fill="none"
                          stroke="#000000"
                          strokeWidth="1.5"
                          markerEnd="url(#arrow)"
                        />
                      );
                    });
                  })}
                </svg>
              )}

              {/* Timeline Rows & Minimalist Monochrome Bars */}
              <div className="pt-0 flex-1 relative z-10">
                {visibleTasks.map(({ task, level }, idx) => {
                  const isHovered = hoveredTaskId === task.id;
                  const isPhase = task.wpType === 'PHASE';
                  const isMilestone = task.wpType === 'MILESTONE' || task.isMilestone;

                  const startDay = getDayOffset(task.startDate || task.dueDate || '2026-09-10');
                  const dueDay = getDayOffset(task.dueDate || '2026-09-10');
                  const durationDays = Math.max(1, dueDay - startDay + 1);

                  const leftPos = startDay * dayWidth;
                  const barWidth = durationDays * dayWidth;
                  const progressPct = task.progress ?? (task.columnId === 'col-done' ? 100 : 0);

                  const startDateFormatted = formatMonoDate(task.startDate || task.dueDate);
                  const dueDateFormatted = formatMonoDate(task.dueDate);

                  return (
                    <div
                      key={task.id}
                      onMouseEnter={() => setHoveredTaskId(task.id)}
                      onMouseLeave={() => setHoveredTaskId(null)}
                      style={{ height: '40px' }}
                      className={`flex items-center relative border-b border-black/10 transition-colors duration-100 ${
                        isHovered ? 'bg-neutral-100' : ''
                      }`}
                    >
                      {/* 1. Milestone Display: Sharp Black Diamond */}
                      {isMilestone ? (
                        <div
                          style={{ left: `${leftPos + dayWidth / 2 - 8}px` }}
                          onClick={() => {
                            setSelectedTask(task);
                            onOpenTaskModal(task);
                          }}
                          className="absolute cursor-pointer flex items-center space-x-2 group/ms"
                        >
                          <div className="w-5 h-5 rotate-45 bg-black border border-black flex items-center justify-center hover:scale-110 transition-transform">
                            <Diamond className="w-2.5 h-2.5 -rotate-45 text-white fill-white" />
                          </div>

                          <div className="flex items-center space-x-2 whitespace-nowrap pl-1 font-mono">
                            <span className="text-[11px] font-bold text-black border-b border-black">
                              {dueDateFormatted}
                            </span>
                            <span className="italic font-serif text-xs text-black font-medium">
                              {task.title}
                            </span>
                          </div>
                        </div>
                      ) : isPhase ? (
                        /* 2. Phase Display: Black bracket container */
                        <div className="absolute flex items-center" style={{ left: `${Math.max(0, leftPos - 75)}px` }}>
                          <span className="font-mono text-[11px] text-neutral-600 font-bold mr-2 w-16 text-right select-none">
                            {startDateFormatted}
                          </span>

                          <div
                            style={{ width: `${Math.max(36, barWidth)}px` }}
                            onMouseDown={e => handleMouseDown(e, task.id, 'MOVE')}
                            onClick={() => {
                              setSelectedTask(task);
                              onOpenTaskModal(task);
                            }}
                            className="h-5 bg-white border-2 border-black relative flex items-center justify-between cursor-grab active:cursor-grabbing group/phase"
                          >
                            {/* Left bracket downward tick */}
                            <div className="w-1.5 h-3 bg-black absolute -left-0.5 top-2" />
                            {/* Right bracket downward tick */}
                            <div className="w-1.5 h-3 bg-black absolute -right-0.5 top-2" />

                            {/* Progress bar inside Phase */}
                            <div
                              style={{ width: `${progressPct}%` }}
                              className="h-full bg-black absolute left-0 top-0 opacity-80"
                            />
                          </div>

                          <div className="flex items-center space-x-2 ml-2 whitespace-nowrap font-mono">
                            <span className="text-[11px] font-bold text-black">
                              {dueDateFormatted}
                            </span>
                            <span className="italic font-serif text-xs text-black font-semibold">
                              {task.title}
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* 3. Task Display: Crisp 2px black bordered bar */
                        <div className="absolute flex items-center" style={{ left: `${Math.max(0, leftPos - 75)}px` }}>
                          <span className="font-mono text-[11px] text-neutral-600 mr-2 w-16 text-right select-none">
                            {startDateFormatted}
                          </span>

                          {/* Task Bar */}
                          <div
                            style={{ width: `${Math.max(30, barWidth)}px` }}
                            onMouseDown={e => handleMouseDown(e, task.id, 'MOVE')}
                            onClick={() => {
                              setSelectedTask(task);
                              onOpenTaskModal(task);
                            }}
                            className={`h-5.5 bg-white border-2 border-black relative flex items-center overflow-hidden cursor-grab active:cursor-grabbing group/bar ${
                              isHovered ? 'bg-neutral-100' : ''
                            }`}
                          >
                            {/* Progress fill */}
                            <div
                              style={{ width: `${progressPct}%` }}
                              className="h-full bg-black absolute left-0 top-0"
                            />

                            {/* Left Resize Handle */}
                            <div
                              onMouseDown={e => {
                                e.stopPropagation();
                                handleMouseDown(e, task.id, 'RESIZE_START');
                              }}
                              className="w-2 h-full absolute left-0 top-0 cursor-w-resize hover:bg-neutral-400 z-10"
                            />

                            {/* Center progress % text */}
                            <span className={`px-1.5 z-5 font-mono text-[10px] font-bold select-none ${progressPct > 50 ? 'text-white' : 'text-black'}`}>
                              {progressPct > 0 ? `${progressPct}%` : ''}
                            </span>

                            {/* Right Resize Handle */}
                            <div
                              onMouseDown={e => {
                                e.stopPropagation();
                                handleMouseDown(e, task.id, 'RESIZE_END');
                              }}
                              className="w-2 h-full absolute right-0 top-0 cursor-e-resize hover:bg-neutral-400 z-10"
                            />
                          </div>

                          {/* Right Due Date Label & Italic Subject Title */}
                          <div className="flex items-center space-x-2 ml-2 whitespace-nowrap font-mono">
                            <span
                              className={`text-[11px] ${
                                task.priority === 'URGENT' ? 'font-bold border-b-2 border-black text-black' : 'text-neutral-700'
                              }`}
                            >
                              {dueDateFormatted}
                            </span>
                            <span className="italic font-serif text-xs text-neutral-800">
                              {task.title}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Info Pane on the Right */}
          {showInfoPane && selectedTask && (
            <div className="w-80 border-l-2 border-black bg-white p-5 flex flex-col justify-between text-xs overflow-y-auto shrink-0 font-serif">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <span className="font-display font-bold text-sm text-black uppercase">WORK PACKAGE DETAIL</span>
                  <button
                    onClick={() => setShowInfoPane(false)}
                    className="text-black font-mono font-bold hover:bg-black hover:text-white px-1.5 py-0.5 border border-black"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">PACKAGE TYPE</span>
                  <div className="mt-1 font-mono font-bold text-xs uppercase">
                    {selectedTask.wpType === 'PHASE' ? (
                      <span className="border border-black px-1.5 py-0.5 bg-black text-white">PHASE</span>
                    ) : selectedTask.wpType === 'MILESTONE' ? (
                      <span className="border border-black px-1.5 py-0.5">MILESTONE</span>
                    ) : (
                      <span className="border border-neutral-400 px-1.5 py-0.5 text-neutral-700">TASK</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">SUBJECT</span>
                  <p className="mt-1 font-display text-base font-bold text-black leading-snug">
                    {selectedTask.title}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 border-2 border-black font-mono">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase">START</span>
                    <p className="font-bold text-black">{selectedTask.startDate || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase">DUE</span>
                    <p className="font-bold text-black">{selectedTask.dueDate}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase">PROGRESS</span>
                    <p className="font-bold text-black">{selectedTask.progress ?? 0}%</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase">PRIORITY</span>
                    <p className="font-bold text-black">{selectedTask.priority}</p>
                  </div>
                </div>

                <div>
                  <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">DESCRIPTION</span>
                  <p className="mt-1 text-xs text-neutral-700 whitespace-pre-line leading-relaxed border-l-2 border-black pl-3 py-1">
                    {selectedTask.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-black">
                <button
                  onClick={() => onOpenTaskModal(selectedTask)}
                  className="w-full py-2.5 bg-black text-white hover:bg-white hover:text-black border-2 border-black font-mono font-bold uppercase tracking-wider transition-colors duration-100 text-center"
                >
                  EDIT WORK PACKAGE →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
