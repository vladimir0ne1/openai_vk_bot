import TelegramBot from './telegramBot';

export default {
	async fetch(request, env) {
		const bot = new TelegramBot(env);
		return bot.handleRequest(request);
	}
};
