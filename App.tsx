import React, { useState, useEffect, useCallback } from 'react';
import { Expense, ChatMessage } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import WhatsAppSimulator from './components/WhatsAppSimulator';
import SettingsModal from './components/SettingsModal';
import { sheetsService } from './services/sheetsService';

const App: React.FC = () => {
  const [userName, setUserName] = useState<string>(localStorage.getItem('user_name') || '');
  const [tempName, setTempName] = useState('');
  const [tempUrl, setTempUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat'>('chat');
  const [sheetUrl, setSheetUrl] = useState<string>(localStorage.getItem('sheet_url') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Sincronización automática al cargar si hay URL
  useEffect(() => {
    if (sheetUrl && expenses.length === 0) {
      syncFromSheet(sheetUrl);
    }
  }, [sheetUrl]);

  const syncFromSheet = async (url: string) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await sheetsService.fetchExpenses(url);
      setExpenses(data);
      if (userName && messages.length === 0) {
        setMessages([
          {
            id: '1',
            text: `¡Hola de nuevo ${userName}! 👋 He recuperado tus ${data.length} gastos del historial.\n\n¿Qué registramos hoy?`,
            sender: 'bot',
            timestamp: new Date()
          }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error de conexión con Sheets.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialSetup = async () => {
    if (!tempUrl.trim()) {
      setError('La URL de Google Sheets es obligatoria para funcionar.');
      return;
    }

    const name = (tempName || 'Usuario').trim();
    const url = tempUrl.trim();

    setIsLoading(true);
    setError('');
    
    try {
      const data = await sheetsService.fetchExpenses(url);
      
      localStorage.setItem('user_name', name);
      localStorage.setItem('sheet_url', url);
      
      setUserName(name);
      setSheetUrl(url);
      setExpenses(data);
      
      setMessages([
        {
          id: '1',
          text: `¡Configuración exitosa! 👋\n\nHe sincronizado ${data.length} registros anteriores de tu base de datos.`,
          sender: 'bot',
          timestamp: new Date()
        }
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSheetUrl = async (url: string) => {
    if (url === sheetUrl) {
      setIsSettingsOpen(false);
      return;
    }
    await syncFromSheet(url);
    setSheetUrl(url);
    localStorage.setItem('sheet_url', url);
    setIsSettingsOpen(false);
  };

  const addExpense = useCallback((data: { amount: number, category: any, description: string, expenseDate: string, id?: string }) => {
    const expense: Expense = {
      id: data.id || crypto.randomUUID(),
      amount: data.amount,
      category: data.category,
      description: data.description,
      expenseDate: data.expenseDate,
      entryDate: new Date().toISOString()
    };
    setExpenses(prev => [expense, ...prev]);
  }, []);

  const deleteExpenseState = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleDeleteExpense = useCallback(async (id: string) => {
    const gasto = expenses.find(e => e.id === id);
    if (!gasto) return;

    if (window.confirm(`¿Seguro que querés borrar "${gasto.description}"?\nEsto eliminará el registro permanentemente.`)) {
      // Borrado optimista en la UI
      deleteExpenseState(id);
      
      // Borrado en la nube
      if (sheetUrl) {
        try {
          await sheetsService.deleteExpense(sheetUrl, id);
        } catch (err) {
          console.error("Error al borrar en Sheets:", err);
        }
      }
    }
  }, [expenses, sheetUrl, deleteExpenseState]);

  const addMessage = useCallback((text: string, sender: 'user' | 'bot') => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      text,
      sender,
      timestamp: new Date()
    }]);
  }, []);

  if (!userName || !sheetUrl) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#075e54] p-6 text-center">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm animate-fade-in border-4 border-emerald-500/10">
          <div className="text-5xl mb-4">🇦🇷</div>
          <h1 className="text-2xl font-black text-gray-800 mb-1 tracking-tighter">GASTOBOT CLOUD</h1>
          <p className="text-gray-400 mb-8 text-[11px] font-bold uppercase tracking-widest">Sincronización Total con Sheets</p>
          
          <div className="space-y-4">
            <div className="space-y-1 text-left">
               <label className="text-[10px] font-black text-slate-400 px-2 uppercase">Tu Nombre</label>
               <input 
                 type="text" 
                 placeholder="Ej: Juan"
                 value={tempName}
                 onChange={(e) => setTempName(e.target.value)}
                 className="w-full bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all"
               />
            </div>

            <div className="space-y-1 text-left">
               <label className="text-[10px] font-black text-slate-400 px-2 uppercase">URL de tu Apps Script</label>
               <input 
                 type="text" 
                 placeholder="https://script.google.com/macros/s/..."
                 value={tempUrl}
                 onChange={(e) => setTempUrl(e.target.value)}
                 className="w-full bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white rounded-2xl px-4 py-3 text-[12px] font-bold text-slate-800 outline-none transition-all"
               />
            </div>

            {error && (
              <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                <p className="text-red-500 text-[10px] font-black leading-tight">{error}</p>
              </div>
            )}
            
            <button 
              onClick={handleInitialSetup}
              disabled={isLoading}
              className="w-full bg-[#075e54] text-white font-black py-4 rounded-2xl shadow-xl hover:bg-emerald-800 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  CONECTANDO...
                </>
              ) : 'VINCULAR MI CUENTA'}
            </button>
            
            <button 
               onClick={() => setShowConfigHelp(true)}
               className="text-[10px] text-emerald-600 font-black hover:underline tracking-widest uppercase"
            >
              ¿Cómo obtener mi URL?
            </button>
          </div>
        </div>
        
        {showConfigHelp && (
          <SettingsModal 
            currentUrl="" 
            onSave={() => {}} 
            onClose={() => setShowConfigHelp(false)} 
            instructionsOnly={true}
          />
        )}
        
        <p className="mt-8 text-emerald-200/40 text-[10px] font-bold tracking-[0.2em] uppercase italic">Powered by Gemini 2.5 & Google Cloud</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col max-w-lg mx-auto bg-white shadow-2xl relative overflow-hidden">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        isSinking={true}
      />
      
      <main className="flex-1 overflow-hidden relative bg-gray-50">
        {activeTab === 'dashboard' ? (
          <Dashboard 
            expenses={expenses} 
            onDelete={handleDeleteExpense} 
          />
        ) : (
          <WhatsAppSimulator 
            messages={messages} 
            addMessage={addMessage} 
            onAddExpense={addExpense}
            onDeleteExpense={deleteExpenseState}
            currentExpenses={expenses}
            sheetUrl={sheetUrl}
            userName={userName}
          />
        )}
      </main>

      {isSettingsOpen && (
        <SettingsModal 
          currentUrl={sheetUrl} 
          onSave={saveSheetUrl} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-md z-[100] flex flex-col items-center justify-center">
            <div className="w-14 h-14 border-4 border-[#075e54] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[#075e54] font-black text-xs tracking-widest animate-pulse">SINCRONIZANDO NUBE...</p>
        </div>
      )}
    </div>
  );
};

export default App;