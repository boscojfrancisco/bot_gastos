
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Expense } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, TrendingDown, Calendar, Tag, CreditCard } from 'lucide-react';

interface DashboardProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Luz': '#FACC15',
  'Agua': '#38BDF8',
  'Internet': '#818CF8',
  'Hipoteca': '#A16207',
  'Alquiler': '#B91C1C',
  'Teléfono': '#4ADE80',
  'Servicio Doméstico': '#F472B6',
  'Ocio': '#FB923C',
  'Restaurantes': '#E11D48',
  'Transporte': '#64748B',
  'Otros': '#94A3B8'
};

const Dashboard: React.FC<DashboardProps> = ({ expenses, onDelete }) => {
  const total = useMemo(() => expenses.reduce((acc, curr) => acc + curr.amount, 0), [expenses]);
  
  const todayTotal = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return expenses
      .filter(e => e.expenseDate === today)
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [expenses]);

  const chartData = useMemo(() => {
    const groups: Record<string, number> = {};
    expenses.forEach(e => {
      groups[e.category] = (groups[e.category] || 0) + e.amount;
    });
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  return (
    <div className="h-full overflow-y-auto p-4 pb-24 bg-[#f8fafc] custom-scrollbar">
      {/* Bento Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center"
        >
          <h2 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Gasto Total</h2>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-300">$</span>
            <span className="text-5xl font-black text-slate-900 tracking-tighter">{total.toLocaleString()}</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-emerald-50 rounded-[2rem] p-5 border border-emerald-100"
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-3 h-3 text-emerald-600" />
            <h3 className="text-emerald-600 text-[9px] font-black uppercase tracking-wider">Hoy</h3>
          </div>
          <p className="text-xl font-black text-emerald-900">${todayTotal.toLocaleString()}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900 rounded-[2rem] p-5 text-white"
        >
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-3 h-3 text-slate-400" />
            <h3 className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Transacciones</h3>
          </div>
          <p className="text-xl font-black">{expenses.length}</p>
        </motion.div>
      </div>

      {expenses.length > 0 ? (
        <div className="space-y-6">
          {/* Chart Section */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 h-72 relative"
          >
            <div className="absolute top-6 left-6">
              <h3 className="text-slate-900 font-black text-sm uppercase tracking-tight">Distribución</h3>
              <p className="text-slate-400 text-[10px] font-bold">Por categoría</p>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#cbd5e1'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: '900'
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black text-slate-900 text-lg tracking-tight">Historial Reciente</h3>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Últimos movimientos</span>
            </div>
            
            <AnimatePresence mode="popLayout">
              {expenses.map((expense, idx) => (
                <motion.div 
                  layout
                  key={expense.id} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white p-4 rounded-3xl shadow-sm flex justify-between items-center border border-slate-50 group hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4 flex-1 pr-4">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${CATEGORY_COLORS[expense.category]}20`, color: CATEGORY_COLORS[expense.category] }}
                    >
                      <Tag className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 truncate text-[15px]">{expense.description}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] font-black uppercase tracking-tighter" style={{ color: CATEGORY_COLORS[expense.category] }}>
                          {expense.category}
                        </span>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[10px] font-bold">
                            {new Date(expense.expenseDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="font-black text-lg text-slate-900">-${expense.amount.toLocaleString()}</span>
                    <button 
                      onClick={() => onDelete(expense.id)}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <TrendingDown className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-slate-900 font-black text-lg mb-1">Sin datos aún</h3>
          <p className="text-slate-400 text-sm font-medium max-w-[200px]">Registra tu primer gasto en el chat para ver las estadísticas.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
