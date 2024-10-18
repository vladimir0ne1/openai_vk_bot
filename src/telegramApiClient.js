const telegramifyMarkdown = require('telegramify-markdown');

export class TelegramApiClient {
  constructor(token) {
    this.token = token;
    this.apiUrl = `https://api.telegram.org/bot${this.token}`;
  }

  async sendMessage(chatId, text, replyToMessageId = null) {
    try {
      const url = `${this.apiUrl}/sendMessage`;
      const fixedText = telegramifyMarkdown(text, 'escape');
      const body = {
        method: 'sendMessage',
        chat_id: chatId,
        text: fixedText,
        parse_mode: 'MarkdownV2'
      };
      if (replyToMessageId) {
        body.reply_to_message_id = replyToMessageId;
      }
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    } catch (error) {
      console.error('Error sending message to Telegram:', error);
      throw error;
    }
  }

  async getFile(fileId) {
    try {
      const url = `${this.apiUrl}/getFile?file_id=${fileId}`;
      const response = await fetch(url);
      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Error getting file from Telegram:', error);
      throw error;
    }
  }
}
