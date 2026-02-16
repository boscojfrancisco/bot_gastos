
import React from 'react';

interface HeaderProps {
  activeTab: 'dashboard' | 'chat';
  setActiveTab: (tab: 'dashboard' | 'chat') => void;
  onOpenSettings: () => void;
  isSinking: boolean;
  isTelegramActive?: boolean;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenSettings, isSinking, isTelegramActive }) => {
  return (
    <header className="bg-[#075e54] text-white p-4 shadow-lg z-30">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black flex items-center gap-2 italic tracking-tighter uppercase">
          <span className="bg-white text-[#075e54] w-8 h-8 flex items-center justify-center rounded-full text-sm not-italic shadow-inner">💰</span>
          GastoBot
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end mr-1">
             {isTelegramActive && (
               <div className="flex items-center gap-1 bg-[#0088cc] px-2 py-0.5 rounded-full border border-white/20 shadow-sm mb-1">
                 <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                 <span className="text-[8px] font-black uppercase tracking-widest">TG Live</span>
               </div>
             )}
             <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${isSinking ? 'bg-emerald-400 text-[#075e54]' : 'bg-slate-500 text-slate-200'}`}>
                {isSinking ? 'Cloud' : 'Offline'}
             </span>
          </div>
          
          {/* BOTÓN DE TUERQUITA (AJUSTES) - REINSTALADO Y MEJORADO */}
          <button 
            onClick={onOpenSettings}
            className="w-11 h-11 flex items-center justify-center bg-white/20 hover:bg-white/30 active:bg-white/40 rounded-2xl transition-all shadow-md group"
            title="Configuración"
          >
            <svg 
              viewBox="0 0 24 24" 
              width="24" 
              height="24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="group-active:rotate-90 transition-transform duration-300"
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      </div>
      <nav className="flex bg-black/10 rounded-2xl p-1">
        <button 
          onClick={() => setActiveTab('chat')} 
          className={`flex-1 py-2.5 text-center text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'chat' ? 'bg-white text-[#075e54] shadow-md' : 'text-emerald-100 hover:bg-white/5'}`}
        >
          WhatsApp
        </button>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`flex-1 py-2.5 text-center text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-white text-[#075e54] shadow-md' : 'text-emerald-100 hover:bg-white/5'}`}
        >
          Panel
        </button>
      </nav>
    </header>
  );
};

export default Header;
