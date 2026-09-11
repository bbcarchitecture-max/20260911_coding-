import React, { useState, useEffect } from 'react';
import {
  Kanban, Calendar, FileQuestion, Terminal, Bell, Shield, User, ChevronDown,
  Layers, Plus, Check, Search, Building2
} from 'lucide-react';
import { Project, User as UserType, Role } from '../types';
import { apiService, subscribeToChanges } from '../services/apiService';

interface NavbarProps {
  currentView: 'kanban' | 'gantt' | 'rfi';
  onSelectView: (view: 'kanban' | 'gantt' | 'rfi') => void;
  onOpenArchitecture: () => void;
  onOpenNotifications: () => void;
  onOpenCreateTask: () => void;
  onOpenCreateRfi: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  onOpenArchitecture,
  onOpenNotifications,
  onOpenCreateTask,
  onOpenCreateRfi
}) => {
  const project = apiService.getProject();
  const users = apiService.getUsers();
  const [currentUser, setCurrentUser] = useState<UserType>(apiService.getCurrentUser());
  const [notifications, setNotifications] = useState(apiService.getNotifications(currentUser.id));
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);

  useEffect(() => {
    const unsub = subscribeToChanges(() => {
      const u = apiService.getCurrentUser();
      setCurrentUser(u);
      setNotifications(apiService.getNotifications(u.id));
    });
    return unsub;
  }, []);

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const handleSwitchUser = (userId: string) => {
    apiService.setCurrentUserId(userId);
    setShowRoleMenu(false);
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-widest border border-current">ARCHITECT</span>;
      case 'PM':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-widest bg-black text-white">PM</span>;
      case 'MEMBER':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-widest border border-current">MEMBER</span>;
      case 'GUEST_AUDITOR':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-widest border border-dashed border-current">AUDITOR</span>;
    }
  };

  return (
    <header className="bg-black text-white border-b-2 border-black sticky top-0 z-30 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: Brand, Project Selector & Quick Create */}
          <div className="flex items-center space-x-3 truncate">
            <button
              onClick={onOpenArchitecture}
              className="p-1.5 border border-white/30 hover:bg-white hover:text-black transition-colors duration-100 flex items-center justify-center"
              title="系統架構與專案規格"
            >
              <Building2 className="w-4 h-4" strokeWidth={1.5} />
            </button>

            {/* Brand Logo & Name */}
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold px-1.5 py-0.5 border border-white/40 tracking-wider">
                {project.code}
              </span>
              <h1 className="font-display text-sm font-bold tracking-tight text-white truncate max-w-[200px] sm:max-w-[320px]">
                {project.name}
              </h1>
            </div>

            {/* Quick Add Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowQuickAddMenu(!showQuickAddMenu)}
                className="px-2.5 py-1 bg-white text-black hover:bg-neutral-200 text-xs font-mono font-bold flex items-center space-x-1 uppercase tracking-wider transition-colors duration-100"
                title="快速新增"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">NEW</span>
                <ChevronDown className="w-3 h-3" strokeWidth={2} />
              </button>

              {showQuickAddMenu && (
                <div
                  className="absolute left-0 mt-1 w-56 bg-white text-black border-2 border-black py-0 z-40 text-xs animate-in fade-in duration-100"
                  onClick={() => setShowQuickAddMenu(false)}
                >
                  <div className="px-3 py-1.5 font-mono text-[10px] text-neutral-500 uppercase tracking-widest border-b border-black/10 bg-neutral-100">
                    CREATE ITEM
                  </div>
                  <button
                    onClick={onOpenCreateTask}
                    className="w-full text-left px-3.5 py-2.5 border-b border-neutral-100 hover:bg-black hover:text-white flex items-center space-x-2 font-serif font-medium transition-colors duration-100"
                  >
                    <Kanban className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>任務工作包 (Task / WP)</span>
                  </button>
                  <button
                    onClick={onOpenCreateRfi}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-black hover:text-white flex items-center space-x-2 font-serif font-medium transition-colors duration-100"
                  >
                    <FileQuestion className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>工程疑問單 (RFI Form)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Center: Module View Switcher */}
          <div className="hidden md:flex items-center border border-white/30 p-0.5 text-xs font-mono">
            <button
              onClick={() => onSelectView('kanban')}
              className={`px-3 py-1 uppercase tracking-wider transition-colors duration-100 flex items-center space-x-1.5 ${
                currentView === 'kanban'
                  ? 'bg-white text-black font-bold'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>KANBAN</span>
            </button>

            <button
              onClick={() => onSelectView('gantt')}
              className={`px-3 py-1 uppercase tracking-wider transition-colors duration-100 flex items-center space-x-1.5 ${
                currentView === 'gantt'
                  ? 'bg-white text-black font-bold'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>GANTT</span>
            </button>

            <button
              onClick={() => onSelectView('rfi')}
              className={`px-3 py-1 uppercase tracking-wider transition-colors duration-100 flex items-center space-x-1.5 ${
                currentView === 'rfi'
                  ? 'bg-white text-black font-bold'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FileQuestion className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>RFI</span>
            </button>
          </div>

          {/* Right Actions: SRS, Notifications, Role Switcher */}
          <div className="flex items-center space-x-2">
            {/* SRS / Architecture Button */}
            <button
              onClick={onOpenArchitecture}
              title="檢視 SRS 規格書與 API 封包日誌"
              className="p-1.5 border border-white/30 hover:bg-white hover:text-black transition-colors duration-100"
            >
              <Terminal className="w-4 h-4" strokeWidth={1.5} />
            </button>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              title="協作通知"
              className="p-1.5 border border-white/30 hover:bg-white hover:text-black transition-colors duration-100 relative"
            >
              <Bell className="w-4 h-4" strokeWidth={1.5} />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-black font-mono text-[9px] font-bold flex items-center justify-center border border-black">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* RBAC Role Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center space-x-2 border border-white/30 px-2 py-1 hover:bg-white hover:text-black transition-colors duration-100 text-left"
              >
                <div className="w-5 h-5 bg-white text-black font-mono text-[10px] font-bold flex items-center justify-center">
                  {currentUser.name.slice(0, 1)}
                </div>
                <div className="hidden sm:block text-left text-xs font-mono">
                  <div className="font-bold leading-tight uppercase">{currentUser.role}</div>
                </div>
                <ChevronDown className="w-3 h-3" strokeWidth={2} />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-1 w-72 bg-white text-black border-2 border-black z-40 text-xs animate-in fade-in duration-100">
                  <div className="px-3 py-2 border-b border-black font-mono text-[10px] uppercase tracking-widest text-neutral-600 bg-neutral-100">
                    SWITCH RBAC IDENTITY
                  </div>

                  <div className="divide-y divide-neutral-200">
                    {users.map(u => {
                      const isCurrent = u.id === currentUser.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSwitchUser(u.id)}
                          className={`w-full text-left p-2.5 flex items-center justify-between transition-colors duration-100 ${
                            isCurrent ? 'bg-neutral-100 font-bold' : 'hover:bg-black hover:text-white'
                          }`}
                        >
                          <div className="truncate">
                            <div className="flex items-center space-x-2">
                              <span className="font-serif font-bold text-xs">{u.name}</span>
                              {getRoleBadge(u.role)}
                            </div>
                            <div className="text-[11px] font-mono text-neutral-500 mt-0.5 truncate">{u.title}</div>
                          </div>
                          {isCurrent && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile View Switcher Tab Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-white/20 text-xs font-mono">
          <button
            onClick={() => onSelectView('kanban')}
            className={`py-1 px-3 uppercase tracking-wider ${
              currentView === 'kanban' ? 'bg-white text-black font-bold' : 'text-white/70'
            }`}
          >
            KANBAN
          </button>
          <button
            onClick={() => onSelectView('gantt')}
            className={`py-1 px-3 uppercase tracking-wider ${
              currentView === 'gantt' ? 'bg-white text-black font-bold' : 'text-white/70'
            }`}
          >
            GANTT
          </button>
          <button
            onClick={() => onSelectView('rfi')}
            className={`py-1 px-3 uppercase tracking-wider ${
              currentView === 'rfi' ? 'bg-white text-black font-bold' : 'text-white/70'
            }`}
          >
            RFI
          </button>
        </div>
      </div>
    </header>
  );
};
