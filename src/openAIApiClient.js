export class OpenAIApiClient {
	constructor(apiKey, model) {
		this.apiKey = apiKey;
		this.apiUrl = 'https://api.openai.com/v1/chat/completions';
		this.model = model || 'gpt-3.5-turbo';
	}

	async askAi(userMessage, previousMessage = null) {
		try {
			const messages = [
				{ role: 'system', content: 'Ты полезный помощник.' }
			]

			// todo: use full conversation chain (probably store in user context?)
			if (previousMessage) {
				messages.push({ role: 'assistant', content: previousMessage })
			}

			messages.push({ role: 'user', content: userMessage })

			const response = await fetch(this.apiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.apiKey}`
				},
				body: JSON.stringify({
					model: this.model,
					messages: messages
				})
			});

			const data = await response.json();
			if (!response.ok) {
				console.error('OpenAI API Error:', data);
				return 'Something went wrongs';
			}
			return data.choices[0].message.content;
		} catch (error) {
			console.error('Error fetching response from OpenAI:', error);
			throw error;
		}
	}
}
