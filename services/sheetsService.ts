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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'list' }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error("Respuesta del servidor no válida.");
      
      const data = await response.json();
      
      if (data.status === 'success' && Array.isArray(data.data)) {
        return data.data.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          amount: Number(item.amount),
          category: item.category as Category,
          description: item.description || "Sin descripción",
          expenseDate: item.expenseDate || new Date().toISOString().split('T')[0],
          entryDate: item.entryDate || new Date().toISOString()
        }));
      }
      return [];
    } catch (error) {
      console.error("Error fetching from Sheets:", error);
      throw new Error("⚠️ No se pudo conectar. Verificá que la URL sea la de 'Aplicación Web' y que el acceso esté configurado como 'Cualquiera'.");
    }
  },

  async bulkAddExpenses(url: string, expenses: SheetExpense[]) {
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'bulkAdd', expenses }),
      });
      return { success: true };
    } catch (error) {
      console.error("Error bulk adding to Sheets:", error);
      return { success: false };
    }
  },

  async addExpense(url: string, expense: SheetExpense) {
    return this.bulkAddExpenses(url, [expense]);
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