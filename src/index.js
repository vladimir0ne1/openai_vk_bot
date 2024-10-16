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
	async fetch(request, env, ctx) {
		// Получаем секретный токен из заголовка запроса
		const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token')

		// Проверяем, совпадает ли он с секретным токеном из переменной окружения
		if (secretToken !== env.TELEGRAM_SECRET_TOKEN) {
			return new Response('Unauthorized', { status: 401 })
		}

		if (request.method === 'POST') {
			const incomingData = await request.json()

			// Получаем текст сообщения от пользователя из Telegram
			const userMessage = incomingData.message?.text || ''

			// Вызов API OpenAI для ответа
			const chatgptResponse = await getChatGPTResponse(userMessage, env)

			// Формируем ответ для пользователя
			const telegramResponse = {
				method: 'sendMessage',
				chat_id: incomingData.message.chat.id,
				text: chatgptResponse
			}

			// Отправляем ответ пользователю через Telegram API
			await sendMessageToTelegram(telegramResponse, env)

			return new Response('OK', { status: 200 })
		} else {
			return new Response('Invalid Request', { status: 405 })
		}
	}
}

// Функция для отправки запроса в OpenAI API (ChatGPT)
async function getChatGPTResponse(userMessage, env) {
	const apiKey = env.OPENAI_API_KEY // Получаем ключ из переменной окружения
	const openaiUrl = 'https://api.openai.com/v1/chat/completions'

	const response = await fetch(openaiUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: 'gpt-3.5-turbo', // Или gpt-4, если нужно
			messages: [
				{ role: 'system', content: 'Ты полезный помощник.' },
				{ role: 'user', content: userMessage }
			]
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
