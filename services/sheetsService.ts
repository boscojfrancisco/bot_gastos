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
      // Usamos un timeout para evitar esperas infinitas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'list' }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (data.status === 'success' && Array.isArray(data.data)) {
        return data.data.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
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
      throw new Error("No se pudo conectar con el Google Sheet. Verificá que el Script esté publicado como 'Web App' y con acceso para 'Cualquiera'.");
    }
  },

  async addExpense(url: string, expense: SheetExpense) {
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors', // Importante para evitar problemas de CORS en escrituras simples
        headers: { 'Content-Type': 'text/plain' },
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
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'delete', id: id }),
      });
      return { success: true };
    } catch (error) {
      console.error("Error deleting from Sheets:", error);
      return { success: false };
    }
  }
};