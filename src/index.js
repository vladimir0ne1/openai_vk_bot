/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env) {

		console.log('Begin request');

		const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
		if (secretToken !== env.TELEGRAM_SECRET_TOKEN) {
			return new Response('Unauthorized', { status: 401 });
		}

		if (request.method !== 'POST') {
			return new Response('Invalid Request', { status: 405 });
		}

		const incomingData = await request.json()
		const userId = incomingData.message?.from?.id || ''
		const userMessage = incomingData.message?.text || ''
		const chatId = incomingData.message?.chat.id || ''

		console.log('Incoming Data:');

		console.log(incomingData);

	  // 1. Проверяем, авторизован ли пользователь (по telegram_id)
		const userAlias = await getUserAliasByTelegramId(userId, env)

		if (userAlias) {
			// Пользователь уже авторизован, используем его алиас для API ключа
			const userApiKey = env[`OPENAI_API_KEY__${userAlias}`];
			if(!userApiKey){
				console.error(`missing api key for [${userAlias}]`)
			}

			await processChatGpt(incomingData, env, userApiKey);
			return new Response('OK', { status: 200 })
		}

		if (userMessage.startsWith('/token')) {
			const inviteKey = userMessage.split(' ')[1]
			const inviteAlias = await getUserAliasByInviteKey(inviteKey, env)

			if (inviteAlias) {
				// Invite key валиден, создаём связь telegram_id -> alias
				await authorizeUserWithInviteKey(userId, inviteAlias, env)
				await sendMessageToTelegram(chatId, 'You have been successfully authorized.', env.TELEGRAM_BOT_TOKEN)
			} else {
				await sendMessageToTelegram(chatId, 'Invalid token. Please try again.', env.TELEGRAM_BOT_TOKEN)
			}

			return new Response('OK', { status: 200 })
		}

		// Если не авторизован и не ввел токен
		// Формируем ответ для пользователя
		const telegramResponse = {
			method: 'sendMessage',
			chat_id: chatId,
			text: 'Please enter a valid invite key using /token <your_token>.'
		};
		await sendMessageToTelegram(telegramResponse, env)
		return new Response('OK', { status: 200 });
	}
}

async function processChatGpt(incomingData, env, userApiKey){
	const userMessage = incomingData.message?.text || ''
	const chatId = incomingData.message?.chat.id || ''

	// Проверяем, есть ли reply на предыдущее сообщение
	const previousMessage = incomingData.message?.reply_to_message?.text || ''

	// Вызов API OpenAI с учётом контекста
	const chatgptResponse = await getChatGPTResponse(userMessage, previousMessage, userApiKey);

	// Формируем ответ для пользователя
	const telegramResponse = {
		method: 'sendMessage',
		chat_id: chatId,
		text: chatgptResponse
	};

	// Отправляем ответ пользователю через Telegram API
	await sendMessageToTelegram(telegramResponse, env);
}

// Функция для получения алиаса пользователя по его Telegram ID
async function getUserAliasByTelegramId(telegramId, env) {
	return await env.OPENAI_VK_BOT_DB.get(`authorized_users_tg_id__${telegramId}`)
}

// Функция для получения алиаса по invite key
async function getUserAliasByInviteKey(inviteKey, env) {
	return await env.OPENAI_VK_BOT_DB.get(`authorized_users_invite_key__${inviteKey}`)
}

// Функция для авторизации пользователя через invite key
async function authorizeUserWithInviteKey(telegramId, alias, env) {
	await env.OPENAI_VK_BOT_DB.put(`authorized_users_tg_id__${telegramId}`, `OPENAI_API_KEY__${alias}`)
}

// Функция для отправки запроса в OpenAI API (ChatGPT) с учётом предыдущего сообщения
async function getChatGPTResponse(userMessage, previousMessage, userApiKey) {
	const apiKey = userApiKey // Получаем ключ из переменной окружения
	const openaiUrl = 'https://api.openai.com/v1/chat/completions'

	// Формируем сообщение для OpenAI с учётом контекста
	const messages = [
		{ role: 'system', content: 'Ты полезный помощник.' }
	]

	// Если есть предыдущее сообщение, включаем его в контекст
	if (previousMessage) {
		messages.push({ role: 'assistant', content: previousMessage })
	}

	// Добавляем текущее сообщение пользователя
	messages.push({ role: 'user', content: userMessage })

	// Отправляем запрос в OpenAI API
	const response = await fetch(openaiUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: 'gpt-3.5-turbo', // Или gpt-4, если нужно
			messages: messages
		})
	})

	const data = await response.json()
	return data.choices[0].message.content
}

// Функция для отправки ответа обратно в Telegram
async function sendMessageToTelegram(responseData, env) {
	const telegramApiUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage` // Используем токен из переменной окружения

	await fetch(telegramApiUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(responseData)
	})
}
