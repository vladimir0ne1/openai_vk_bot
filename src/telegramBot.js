import { TelegramApiClient } from './telegramApiClient';
import { OpenAIApiClient } from './openAIApiClient';
import { DataProvider } from './dataProvider';

export default class TelegramBot {
  constructor(env) {
    this.env = env; // environment variables
    this.DB = new DataProvider(env); // KV database
    this.telegramApiClient = new TelegramApiClient(env.TELEGRAM_BOT_TOKEN);
    this.tgMessage = {};
    this.user = {
      telegramId: undefined,
      alias: undefined,
      openAiModel: 'gpt-3.5-turbo' // use by default. todo: add logic to change model in future
    };
    this.openAIClient = {};
  }

  async handleRequest(request) {
    try {
      this.validateRequest(request);
      await this.initContext(request);

      if (this.isBotCommand('/token')) {
        await this.handleInviteToken();
      } else {
        await this.authorize();
        await this.processChatGpt();
      }

      return new Response('OK', { status: 200 });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async initContext(request) {
    const incomingData = await request.json();
    this.tgMessage = incomingData.message;
    this.user.telegramId = incomingData.message?.from?.id || '';
  }

  async processChatGpt() {
    try {
      const userMessage = this.tgMessage?.text || '';
      const chatId = this.tgMessage?.chat.id || '';
      const previousMessage = this.tgMessage?.reply_to_message?.text || '';

      const chatgptResponse = await this.openAIClient.askAi(userMessage, previousMessage);

      await this.telegramApiClient.sendMessage(chatId, chatgptResponse, this.tgMessage?.message_id);
    } catch (error) {
      console.error('Error processing ChatGPT response:', error);
      throw error;
    }
  }

  async handleInviteToken() {
    const inviteToken = this.tgMessage.text.split(' ')[1]; // format: /token 123456
    const userAlias = await this.DB.getUserAliasByInviteToken(inviteToken);

    if (!userAlias) {
      // todo: ban if fail 5 times
      throw new InvalidInviteTokenError('Invalid invite token');
    }

    await this.DB.saveTelegramId(this.user.telegramId, userAlias);
    // remove invite key - it can be used only once
    await this.DB.archiveInviteToken(inviteToken, userAlias);
    this.user.alias = userAlias;

    await this.telegramApiClient.sendMessage(this.tgMessage.chat.Id, 'You have been successfully authorized.');
  }

  isBotCommand(command) {
    const entities = this.tgMessage?.entities;
    const text = this.tgMessage?.text;

    return !!(entities && entities[0].type === 'bot_command' && text.startsWith(command));
  }

  async authorize() {
    this.user.alias = await this.DB.getUserAliasByTelegramId(this.user.telegramId);

    if (!this.user.alias) {
      // todo: ban if fail 5 times
      throw new UnauthorizedError('User is not authorized');
    }

    const userApiKey = this.DB.getUserOpenAIApiKey(this.user.alias);

    if (!userApiKey) {
      throw new UnauthorizedError(`Missing API Key for user: ${this.user.alias}`);
    }

    this.openAIClient = new OpenAIApiClient(userApiKey);
  }

  validateRequest(request) {
    this.validateTelegramSecretToken(request.headers);
    this.validateRequestMethod(request.method);
  }

  validateTelegramSecretToken(headers) {
    const secretToken = headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (secretToken !== this.env.TELEGRAM_SECRET_TOKEN) {
      console.warn('Invalid secret token');
      throw new UnauthorizedError('Invalid Telegram secret token');
    }
  }

  validateRequestMethod(method) {
    if (method !== 'POST') {
      console.warn('Invalid request method');
      throw new InvalidRequestMethodError('Invalid request method');
    }
  }

  async handleError(error) {
    if (error instanceof UnauthorizedError) {
      return new Response('Unauthorized', { status: 401 });
    } else if (error instanceof InvalidRequestMethodError) {
      return new Response('Invalid Request', { status: 405 });
    } else if (error instanceof MissingApiKeyError) {
      return new Response('Missing API key', { status: 500 });
    } else if (error instanceof InvalidInviteTokenError) {
      return new Response('Invalid Token', { status: 403 });
    } else {
      console.error('Unexpected error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
}

class UnauthorizedError extends Error {
}

class InvalidRequestMethodError extends Error {
}

class MissingApiKeyError extends Error {
}

class InvalidInviteTokenError extends Error {
}
