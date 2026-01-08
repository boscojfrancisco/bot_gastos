
export type Category = 
  | 'Luz' 
  | 'Agua' 
  | 'Internet' 
  | 'Hipoteca' 
  | 'Alquiler' 
  | 'Teléfono' 
  | 'Servicio Doméstico' 
  | 'Ocio' 
  | 'Restaurantes' 
  | 'Transporte' 
  | 'Otros';

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string;
  entryDate: string; // Fecha en que se anotó
  expenseDate: string; // Fecha en que ocurrió el gasto
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}
