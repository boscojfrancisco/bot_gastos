import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Expense } from '../types';

interface DashboardProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Luz': '#FFD700',
  'Agua': '#00BFFF',
  'Internet': '#6A5ACD',
  'Hipoteca': '#8B4513',
  'Alquiler': '#A52A2A',
  'Teléfono': '#32CD32',
  'Servicio Doméstico': '#FF69B4',
  'Ocio': '#FF4500',
  'Restaurantes': '#DC143C',
  'Transporte': '#708090',
  'Otros': '#808080'
};

const Dashboard: React.FC<DashboardProps> = ({ expenses, onDelete }) => {
  const total = useMemo(() => expenses.reduce((acc, curr) => acc + curr.amount, 0), [expenses]);

  const chartData = useMemo(() => {
    const groups: Record<string, number> = {};
    expenses.forEach(e => {
      groups[e.category] = (groups[e.category] || 0) + e.amount;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  return (
    <div className="h-full overflow-y-auto p-4 pb-24 bg-gray-50">
      <div className="bg-white rounded-3xl p-8 shadow-sm mb-6 text-center">
        <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Total Acumulado</h2>
        <p className="text-5xl font-black text-[#075e54]">${total.toLocaleString()}</p>
      </div>

      {expenses.length > 0 ? (
        <>
          <div className="bg-white rounded-3xl p-4 shadow-sm mb-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#ccc'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`$${value}`, 'Monto']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-gray-800 px-2 text-lg">Historial de Gastos</h3>
            {expenses.map(expense => (
              <div 
                key={expense.id} 
                className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border-l-4 relative overflow-hidden transition-all" 
                style={{ borderColor: CATEGORY_COLORS[expense.category] }}
              >
                <div className="flex-1 pr-4">
                  <p className="font-bold text-gray-800 line-clamp-1">{expense.description}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {expense.category}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      📅 {new Date(expense.expenseDate + 'T00:00:00').toLocaleDateString('es-AR')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-lg text-gray-800 whitespace-nowrap">-${expense.amount.toLocaleString()}</span>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(expense.id);
                    }}
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-500 hover:text-white active:scale-90 transition-all shadow-sm"
                    aria-label="Borrar gasto"
                  >
                    <svg 
                      className="pointer-events-none"
                      viewBox="0 0 24 24" 
                      width="20" 
                      height="20" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-20">
          <div className="text-6xl mb-6 grayscale opacity-20">📉</div>
          <p className="text-gray-400 font-medium">Empieza a registrar para ver tus gráficas</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;