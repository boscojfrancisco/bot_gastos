
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
      
      if (!response.ok) {
        let errorMsg = "Respuesta del servidor no válida.";
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }
      
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
      // If status is not success but no error was thrown, it's an unexpected response
      throw new Error(data.message || "Formato de datos inesperado de la planilla.");
    } catch (error: any) {
      console.error("Error fetching from Sheets:", error);
      // Mantener el mensaje específico para el setup inicial
      if (error.message.includes("network error") || error.message.includes("abort")) {
        throw new Error("⚠️ No se pudo conectar. Verificá que la URL sea la de 'Aplicación Web' y que el acceso esté configurado como 'Cualquiera'.");
      }
      throw error; // Propagar otros errores más específicos
    }
  },

  async bulkAddExpenses(url: string, expenses: SheetExpense[]) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors', // Cambiado a 'cors' para poder leer la respuesta
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'bulkAdd', expenses }),
      });

      if (!response.ok) {
        let errorMsg = "Error desconocido al agregar a la planilla.";
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      if (data.status === 'success') {
        return { success: true, count: data.count };
      } else {
        throw new Error(data.message || "Error al agregar gastos.");
      }
    } catch (error: any) {
      console.error("Error bulk adding to Sheets:", error);
      throw new Error(`Fallo de red o servidor al guardar: ${error.message}`);
    }
  },

  async addExpense(url: string, expense: SheetExpense) {
    return this.bulkAddExpenses(url, [expense]);
  },

  async deleteExpense(url: string, id: string) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors', // Cambiado a 'cors' para poder leer la respuesta
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'delete', id: id }),
      });

      if (!response.ok) {
        let errorMsg = "Error desconocido al borrar de la planilla.";
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (data.status === 'deleted') {
        return { success: true };
      } else if (data.status === 'error') {
        throw new Error(data.message || "Error al borrar el gasto.");
      } else {
        throw new Error("Respuesta inesperada al borrar el gasto.");
      }
    } catch (error: any) {
      console.error("Error deleting from Sheets:", error);
      throw new Error(`Fallo de red o servidor al borrar: ${error.message}`);
    }
  }
};
