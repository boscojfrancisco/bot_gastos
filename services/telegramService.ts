
const TELEGRAM_TOKEN = "7996931159:AAGL2EufDN3NzgbVJ71nq6NcUnpzrSNuJas";
const BASE_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
    };
    text?: string;
    date: number;
  };
}

export const telegramService = {
  async getUpdates(offset: number = 0): Promise<TelegramUpdate[]> {
    try {
      const response = await fetch(`${BASE_URL}/getUpdates?offset=${offset}&timeout=30`);
      const data = await response.json();
      if (data.ok) return data.result;
      return [];
    } catch (error) {
      console.error("Error fetching Telegram updates:", error);
      return [];
    }
  },

  async sendMessage(chatId: number, text: string) {
    try {
      await fetch(`${BASE_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown'
        })
      });
    } catch (error) {
      console.error("Error sending Telegram message:", error);
    }
  }
};
