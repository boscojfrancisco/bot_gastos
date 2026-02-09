import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Expense } from "../types";

const CATEGORIES = [
  'Luz', 'Agua', 'Internet', 'Hipoteca', 'Alquiler', 
  'Teléfono', 'Servicio Doméstico', 'Ocio', 'Restaurantes', 
  'Transporte', 'Otros'
];

const addExpenseTool: FunctionDeclaration = {
  name: 'add_expense',
  parameters: {
    type: Type.OBJECT,
    description: 'Registra un nuevo gasto. Llama a esta función varias veces si el usuario menciona múltiples gastos.',
    properties: {
      amount: { type: Type.NUMBER, description: 'Monto en pesos' },
      category: { type: Type.STRING, description: 'Categoría', enum: CATEGORIES },
      description: { type: Type.STRING, description: 'Qué se compró' },
      expenseDate: { type: Type.STRING, description: 'Fecha YYYY-MM-DD. Por defecto hoy.' },
    },
    required: ['amount', 'category', 'description', 'expenseDate'],
  },
};

const getExpensesHistoryTool: FunctionDeclaration = {
  name: 'get_expenses_history',
  parameters: {
    type: Type.OBJECT,
    description: 'Consulta el historial de gastos. Puede filtrar por rango de fechas si el usuario lo pide (ej: "gastos de febrero" o "últimos 10 días").',
    properties: {
      startDate: { type: Type.STRING, description: 'Fecha inicio YYYY-MM-DD (opcional)' },
      endDate: { type: Type.STRING, description: 'Fecha fin YYYY-MM-DD (opcional)' },
      filterDescription: { type: Type.STRING, description: 'Descripción de lo que busca el usuario (ej: "mes de febrero") para el contexto.' }
    },
  },
};

const deleteExpenseTool: FunctionDeclaration = {
  name: 'delete_expense',
  parameters: {
    type: Type.OBJECT,
    description: 'Elimina un gasto.',
    properties: {
      searchQuery: { type: Type.STRING, description: 'Descripción o monto para buscar el gasto a eliminar.' },
    },
    required: ['searchQuery'],
  },
};

export async function processUserMessage(
  text: string, 
  currentExpenses: Expense[],
  userName: string = "Usuario"
) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const dayName = new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(now);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: text,
      config: {
        tools: [{ functionDeclarations: [addExpenseTool, deleteExpenseTool, getExpensesHistoryTool] }],
        systemInstruction: `Eres GastoBot Argentina. Usuario: ${userName}. Hoy es ${dayName} ${todayStr}.
        
        REGLAS CRÍTICAS:
        1. Si el usuario menciona varios gastos (ej: "gasté 100 en pan y 200 en coca"), DEBES llamar a 'add_expense' UNA VEZ POR CADA GASTO.
        2. Si el usuario pide un informe o resumen de fechas específicas (ej: "gastos de ayer", "febrero", "esta semana"), llama a 'get_expenses_history' con startDate y endDate.
        3. Sé amable, usa emojis y responde con estilo argentino.
        4. Categorías permitidas: ${CATEGORIES.join(', ')}.`
      },
    });

    const functionCalls = response.functionCalls;
    
    if (functionCalls && functionCalls.length > 0) {
      return { type: 'FUNCTION_CALLS', calls: functionCalls };
    }

    return { type: 'TEXT', text: response.text || "No entendí, ¿me lo repetís?" };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { type: 'TEXT', text: "⚠️ Error al procesar el mensaje. Revisa tu conexión." };
  }
}
