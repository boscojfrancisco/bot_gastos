
import { Expense } from "../types";
import { processUserMessage } from "./geminiService";
import { sheetsService } from "./sheetsService";

export interface ProcessResult {
  botResponse: string;
  expensesAdded: Expense[];
  expensesDeleted: string[]; // IDs
}

export const expenseProcessor = {
  async process(
    text: string, 
    currentExpenses: Expense[], 
    userName: string, 
    sheetUrl?: string
  ): Promise<ProcessResult> {
    const result = await processUserMessage(text, currentExpenses, userName);
    const expensesAdded: Expense[] = [];
    const expensesDeleted: string[] = [];
    let botResponses: string[] = [];

    if (result.type === 'FUNCTION_CALLS' && result.calls) {
      for (const call of result.calls) {
        const { name, args } = call;
        if (!args) continue;

        if (name === 'add_expense') {
          let amount = Number(args.amount);
          // Multiplicador ARS (Contexto Argentina)
          if (Number.isInteger(amount) && amount < 1000) {
            amount *= 1000;
          }
          const newExpense: Expense = { 
            ...args as any, 
            amount, 
            id: crypto.randomUUID(), 
            entryDate: new Date().toISOString() 
          };
          expensesAdded.push(newExpense);
        } 
        
        else if (name === 'delete_expense') {
          const query = (args.searchQuery as string).toLowerCase();
          const toDelete = currentExpenses.find(e => 
            e.description.toLowerCase().includes(query) || 
            e.amount.toString() === query
          );
          
          if (toDelete) {
            try {
              if (sheetUrl) await sheetsService.deleteExpense(sheetUrl, toDelete.id);
              expensesDeleted.push(toDelete.id);
              botResponses.push(`🗑️ Borré: **${toDelete.description}** ($${toDelete.amount.toLocaleString()}).`);
            } catch (err: any) {
              botResponses.push(`⚠️ Error al borrar en la planilla: ${err.message}`);
            }
          } else {
            botResponses.push(`No encontré nada con "${query}".`);
          }
        }

        else if (name === 'get_expenses_history') {
          const { startDate, endDate } = args as any;
          let filtered = [...currentExpenses];
          if (startDate) filtered = filtered.filter(e => e.expenseDate >= startDate);
          if (endDate) filtered = filtered.filter(e => e.expenseDate <= endDate);

          const totalPeriodo = filtered.reduce((acc, curr) => acc + Number(curr.amount), 0);
          
          if (filtered.length === 0) {
            botResponses.push("No hay gastos registrados en este periodo.");
            continue;
          }

          const sorted = filtered.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
          
          let report = sorted.map(e => {
            const dateStr = new Date(e.expenseDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
            return `• ${dateStr} - ${e.description}: **$${e.amount.toLocaleString()}**`;
          }).join('\n');

          report += `\n\n💰 **TOTAL: $${totalPeriodo.toLocaleString()}**`;
          botResponses.push(report);
        }
      }

      if (expensesAdded.length > 0) {
        try {
          if (sheetUrl) await sheetsService.bulkAddExpenses(sheetUrl, expensesAdded);
          const totalBatch = expensesAdded.reduce((sum, e) => sum + Number(e.amount), 0);
          botResponses.push(`✅ Registrado: **$${totalBatch.toLocaleString()}**.`);
        } catch (err: any) {
          botResponses.push(`⚠️ Error al guardar en la planilla: ${err.message}`);
        }
      }

      return {
        botResponse: botResponses.join('\n\n'),
        expensesAdded,
        expensesDeleted
      };
    } 
    
    return {
      botResponse: result.text || "No entendí la solicitud.",
      expensesAdded: [],
      expensesDeleted: []
    };
  }
};
