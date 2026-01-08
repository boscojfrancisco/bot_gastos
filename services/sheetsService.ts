
export interface SheetExpense {
  id: string; // ID es obligatorio ahora para sincronizar
  amount: number;
  category: string;
  description: string;
  expenseDate: string;
}

export const sheetsService = {
  async addExpense(url: string, expense: SheetExpense) {
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        // Enviamos action: 'add' y el ID
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
        // Enviamos action: 'delete' y el ID a borrar
        body: JSON.stringify({ action: 'delete', id: id }),
      });
      return { success: true };
    } catch (error) {
      console.error("Error deleting from Sheets:", error);
      return { success: false };
    }
  }
};
