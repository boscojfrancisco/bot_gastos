
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
    <header className="bg-[#075e54] text-white p-4 pt-5 shadow-xl z-30 relative">
      <div className="flex items-center justify-between mb-4">
        {/* Logo e Indicadores de Estado */}
        <div className="flex items-center gap-3">
          <div className="bg-white text-[#075e54] w-9 h-9 flex items-center justify-center rounded-xl text-lg shadow-md">
            💰
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tighter uppercase italic leading-none">GastoBot</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isSinking ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'}`}></span>
              <span className="text-[9px] font-bold opacity-90 uppercase tracking-widest">
                {isSinking ? 'Online' : 'Local'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Indicador Telegram */}
          {isTelegramActive && (
            <div className="hidden sm:flex items-center gap-1.5 bg-[#0088cc]/90 px-2.5 py-1 rounded-lg border border-white/10 shadow-sm">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black uppercase tracking-wider">TG Live</span>
            </div>
          )}
          
          {/* BOTÓN DE CONFIGURACIÓN - ALTO CONTRASTE */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              onOpenSettings();
            }}
            className="group flex items-center gap-2 bg-white text-[#075e54] px-3 py-2 rounded-xl shadow-lg hover:bg-gray-100 active:scale-95 transition-all"
            aria-label="Abrir Configuración"
          >
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Ajustes</span>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="group-hover:rotate-90 transition-transform duration-500">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
        </div>
      </div>

      <nav className="flex bg-black/20 rounded-xl p-1 backdrop-blur-sm">
        <button 
          onClick={() => setActiveTab('chat')} 
          className={`flex-1 py-2.5 text-center text-[11px] font-black uppercase tracking-[0.15em] rounded-lg transition-all ${activeTab === 'chat' ? 'bg-white text-[#075e54] shadow-md transform scale-[1.02]' : 'text-emerald-100/70 hover:text-white hover:bg-white/10'}`}
        >
          Chat
        </button>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`flex-1 py-2.5 text-center text-[11px] font-black uppercase tracking-[0.15em] rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-white text-[#075e54] shadow-md transform scale-[1.02]' : 'text-emerald-100/70 hover:text-white hover:bg-white/10'}`}
        >
          Resumen
        </button>
      </nav>
    </header>
  );
};

export default Header;
