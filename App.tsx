
import React, { useState, useEffect, useCallback } from 'react';
import { Expense, ChatMessage } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import WhatsAppSimulator from './components/WhatsAppSimulator';
import LiveVoiceControl from './components/LiveVoiceControl';
import SettingsModal from './components/SettingsModal';

const App: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat'>('chat');
  const [sheetUrl, setSheetUrl] = useState<string>(localStorage.getItem('sheet_url') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: '¡Hola! Soy GastoBot Argentina 🇦🇷\n\nPodés decirme "Gaste 5000 en pizza hoy" o "Ayer gasté 3000 en taxi". \n\n⚠️ Si no me decís fecha, anoto para hoy.',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);

  useEffect(() => {
    const saved = localStorage.getItem('expenses');
    if (saved) {
      try {
        setExpenses(JSON.parse(saved));
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  const saveSheetUrl = (url: string) => {
    setSheetUrl(url);
    localStorage.setItem('sheet_url', url);
    setIsSettingsOpen(false);
  };

  // Ahora acepta un ID opcional para sincronizar con Sheets
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
          />
        )}
      </main>

      <LiveVoiceControl 
        onAddExpense={addExpense} 
        addMessage={addMessage}
        isVisible={activeTab === 'chat'}
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
