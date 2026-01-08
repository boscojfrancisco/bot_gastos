
import React from 'react';

interface HeaderProps {
  activeTab: 'dashboard' | 'chat';
  setActiveTab: (tab: 'dashboard' | 'chat') => void;
  onOpenSettings: () => void;
  isSinking: boolean;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenSettings, isSinking }) => {
  return (
    <header className="bg-[#075e54] text-white p-4 shadow-md z-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="bg-white text-[#075e54] p-1 rounded-full text-sm">💰</span>
          GastoBot
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
             <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSinking ? 'bg-emerald-400 text-white animate-pulse' : 'bg-gray-400 text-gray-200'}`}>
                {isSinking ? 'REAL-TIME SYNC' : 'LOCAL MODE'}
             </span>
          </div>
          <button 
            onClick={onOpenSettings}
            className="p-2 hover:bg-emerald-700 rounded-full transition-colors"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <nav className="flex border-b border-emerald-700">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 text-center font-semibold transition-colors ${
            activeTab === 'chat' ? 'border-b-4 border-white' : 'text-emerald-200'
          }`}
        >
          CHAT
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-2 text-center font-semibold transition-colors ${
            activeTab === 'dashboard' ? 'border-b-4 border-white' : 'text-emerald-200'
          }`}
        >
          RESUMEN
        </button>
      </nav>
    </header>
  );
};

export default Header;
