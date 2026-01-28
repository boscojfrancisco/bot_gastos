import { Expense, Category } from "../types";

export interface SheetExpense {
  id: string;
  amount: number;
  category: string;
  description: string;
  expenseDate: string;
}

export const sheetsService = {
  async fetchExpenses(url: string): Promise<Expense[]> {
    try {
      // Usamos POST con acción 'list' para obtener los datos
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'list' }),
      });
      
      const data = await response.json();
      if (data.status === 'success' && Array.isArray(data.data)) {
        return data.data.map((item: any) => ({
          id: item.id,
          amount: Number(item.amount),
          category: item.category as Category,
          description: item.description,
          expenseDate: item.expenseDate,
          entryDate: item.entryDate || new Date().toISOString()
        }));
      }
      return [];
    } catch (error) {
      console.error("Error fetching from Sheets:", error);
      throw new Error("No se pudo conectar con el Google Sheet. Verifica la URL.");
    }
  },

  async addExpense(url: string, expense: SheetExpense) {
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...expense }),
      });
      return { success: true };
    } catch (error) {
      console.error("Error adding to Sheets:", error);
      return { success: false };
    }
  },

  async deleteExpense(url: string, id: string) {
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: id }),
      });
      return { success: true };
    } catch (error) {
      console.error("Error deleting from Sheets:", error);
      return { success: false };
    }
  }
};