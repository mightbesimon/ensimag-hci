/** Asks the backend for the conversation's semantic outline.
 *
 *  The stub derives it locally; a real deployment would have the endpoint ask
 *  the model. Either way the interface only ever sees this shape, so swapping
 *  one for the other needs no change here. */
export class OutlineClient {
	async outline(messages) {
		const response = await fetch('/api/outline', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messages }),
		});
		const payload = await response.json();
		return payload.topics;
	}
}
