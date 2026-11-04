/** Talks to the Ollama chat API over NDJSON. Works against the stub backend in
 *  server/ and against a real Ollama daemon without change. */
export class OllamaClient {
	async models() {
		const response = await fetch('/api/tags');
		const payload = await response.json();
		return payload.models.map((entry) => entry.name);
	}

	/** Yields content fragments as they arrive. */
	async *stream(model, messages) {
		const response = await fetch('/api/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ model, messages, stream: true }),
		});

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop();

			for (const line of lines) {
				if (!line.trim()) continue;
				const payload = JSON.parse(line);
				if (payload.done) return;
				yield payload.message.content;
			}
		}
	}
}
