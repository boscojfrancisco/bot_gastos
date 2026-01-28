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
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat'>('chat');
  const [sheetUrl, setSheetUrl] = useState<string>(localStorage.getItem('sheet_url') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Cargar datos del sheet si la URL ya existe al iniciar
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
            text: `¡Hola ${userName}! 👋 He cargado tus ${data.length} gastos del historial.\n\nSoy GastoBot Argentina 🇦🇷. ¿Qué registramos hoy?`,
            sender: 'bot',
            timestamp: new Date()
          }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setError('La URL de Google Sheets no es válida o el Script no está configurado correctamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialSetup = async () => {
    if (!tempUrl.trim()) {
      setError('La URL de Google Sheets es obligatoria.');
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
          text: `¡Bienvenido ${name}! 👋 Sincronización exitosa con Google Sheets.\n\nHe recuperado ${data.length} registros anteriores.`,
          sender: 'bot',
          timestamp: new Date()
        }
      ]);
    } catch (err) {
      setError('No se pudo conectar con el Sheet. Asegurate de haber publicado el Script como Web App accesible por "Cualquiera".');
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

  const deleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  const addMessage = useCallback((text: string, sender: 'user' | 'bot') => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      text,
      sender,
      timestamp: new Date()
    }]);
  }, []);

  // Pantalla de configuración inicial obligatoria
  if (!userName || !sheetUrl) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#075e54] p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm animate-fade-in">
          <div className="text-5xl mb-4">☁️</div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">Conectar Base de Datos</h1>
          <p className="text-gray-500 mb-6 text-sm font-medium">Configurá tu Google Sheets para guardar y sincronizar tus gastos permanentemente.</p>
          
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Tu nombre"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="w-full bg-gray-50 border-2 border-gray-100 focus:border-emerald-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-bold text-gray-800 outline-none transition-all"
            />
            
            <input 
              type="text" 
              placeholder="URL Web App (Apps Script)"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              className="w-full bg-gray-50 border-2 border-gray-100 focus:border-emerald-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-bold text-gray-800 outline-none transition-all"
            />

            {error && <p className="text-red-500 text-[11px] font-bold bg-red-50 p-2 rounded-lg">{error}</p>}
            
            <button 
              onClick={handleInitialSetup}
              disabled={isLoading}
              className="w-full bg-[#075e54] text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-emerald-800 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'SINCRONIZANDO...' : 'VINCULAR Y ENTRAR'}
            </button>
            
            <a 
               href="https://docs.google.com/spreadsheets/u/0/create" 
               target="_blank" 
               className="block text-[10px] text-emerald-600 font-bold hover:underline"
            >
              ¿Cómo crear mi Google Sheet?
            </a>
          </div>
        </div>
        <p className="mt-8 text-emerald-200/60 text-xs font-medium">GastoBot Argentina 🇦🇷 v2.0</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col max-w-lg mx-auto bg-white shadow-2xl relative overflow-hidden">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        isSinking={!!sheetUrl}
      />
      
      <main className="flex-1 overflow-hidden relative bg-gray-50">
        {activeTab === 'dashboard' ? (
          <Dashboard 
            expenses={expenses} 
            onDelete={async (id) => {
               if (window.confirm("¿Estás seguro de que querés borrar este gasto? Se eliminará permanentemente de Google Sheets.")) {
                  deleteExpense(id);
                  if (sheetUrl) await sheetsService.deleteExpense(sheetUrl, id);
               }
            }} 
          />
        ) : (
          <WhatsAppSimulator 
            messages={messages} 
            addMessage={addMessage} 
            onAddExpense={addExpense}
            onDeleteExpense={deleteExpense}
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
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#075e54] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[#075e54] font-black text-sm animate-pulse">SINCRONIZANDO CON SHEETS...</p>
        </div>
      )}
    </div>
  );
};

export default App;