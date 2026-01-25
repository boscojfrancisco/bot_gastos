
import React, { useState, useEffect, useCallback } from 'react';
import { Expense, ChatMessage } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import WhatsAppSimulator from './components/WhatsAppSimulator';
import LiveVoiceControl from './components/LiveVoiceControl';
import SettingsModal from './components/SettingsModal';

const App: React.FC = () => {
  const [userName, setUserName] = useState<string>(localStorage.getItem('user_name') || '');
  const [tempName, setTempName] = useState('');
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat'>('chat');
  const [sheetUrl, setSheetUrl] = useState<string>(localStorage.getItem('sheet_url') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Efecto para cargar gastos y configurar el mensaje inicial
  useEffect(() => {
    const savedExpenses = localStorage.getItem('expenses');
    if (savedExpenses) {
      try {
        setExpenses(JSON.parse(savedExpenses));
      } catch (e) { console.error(e); }
    }

    // Solo establecer el mensaje inicial si ya tenemos nombre
    if (userName && messages.length === 0) {
      setMessages([
        {
          id: '1',
          text: `¡Hola ${userName}! 👋 Soy GastoBot Argentina 🇦🇷\n\nPodés decirme "Gaste 5000 en pizza hoy" o "Ayer gasté 3000 en taxi".`,
          sender: 'bot',
          timestamp: new Date()
        }
      ]);
    }
  }, [userName]); // Dependencia userName para actualizar si cambia

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  const handleNameSubmit = () => {
    if (!tempName.trim()) return;
    const name = tempName.trim();
    localStorage.setItem('user_name', name);
    setUserName(name);
    // Forzamos el mensaje inicial inmediatamente
    setMessages([
      {
        id: '1',
        text: `¡Hola ${name}! 👋 Soy GastoBot Argentina 🇦🇷\n\nPodés decirme "Gaste 5000 en pizza hoy" o "Ayer gasté 3000 en taxi".`,
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
  };

  const saveSheetUrl = (url: string) => {
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

  // PANTALLA DE BIENVENIDA / ONBOARDING
  if (!userName) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#075e54] p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm animate-fade-in">
          <div className="text-5xl mb-4">👋</div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">¡Bienvenido!</h1>
          <p className="text-gray-500 mb-6 text-sm">Para empezar, ¿cómo te gustaría que te llame?</p>
          
          <input 
            type="text" 
            placeholder="Tu nombre (ej: Juan)"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            autoFocus
            className="w-full bg-gray-100 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-xl px-4 py-3 text-lg font-bold text-gray-800 outline-none transition-all mb-4 text-center"
          />
          
          <button 
            onClick={handleNameSubmit}
            disabled={!tempName.trim()}
            className="w-full bg-[#075e54] text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            COMENZAR
          </button>
        </div>
        <p className="mt-8 text-emerald-200/60 text-xs font-medium">GastoBot Argentina 🇦🇷</p>
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
          <Dashboard expenses={expenses} onDelete={deleteExpense} />
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

      <LiveVoiceControl 
        onAddExpense={addExpense} 
        addMessage={addMessage}
        isVisible={activeTab === 'chat'}
        userName={userName}
      />

      {isSettingsOpen && (
        <SettingsModal 
          currentUrl={sheetUrl} 
          onSave={saveSheetUrl} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;
