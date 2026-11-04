import { Icons } from './icons.js';

const PIN_THRESHOLD = 120;

const GREETINGS = Object.freeze([
	[5, 'Good morning'],
	[12, 'Good afternoon'],
	[18, 'Good evening'],
]);

/** The conversation column: welcome state, message turns and streaming. */
export class ChatView {
	#thread;
	#welcome;
	#messages;
	#dock;
	#title;
	#store;
	#client;
	#renderer;
	#composer;

	constructor(elements, store, client, renderer, composer) {
		this.#thread = elements.thread;
		this.#welcome = elements.welcome;
		this.#messages = elements.messages;
		this.#dock = elements.dock;
		this.#title = elements.title;
		this.#store = store;
		this.#client = client;
		this.#renderer = renderer;
		this.#composer = composer;
		this.#bind();
	}

	render() {
		const conversation = this.#store.active;
		this.#welcome.hidden = Boolean(conversation);
		this.#title.textContent = conversation ? conversation.title : '';

		if (!conversation) {
			this.#welcome.querySelector('.greeting-text').textContent =
				`${this.#greeting()}, ${this.#store.user.name}`;
			this.#welcome.querySelector('.composer-slot').append(this.#composer.element);
			this.#messages.innerHTML = '';
			this.#composer.focus();
			return;
		}

		this.#dock.querySelector('.composer-slot').append(this.#composer.element);
		this.#messages.innerHTML = conversation.messages
			.map((message, index) => this.#turn(message, index)).join('');
		Icons.paint(this.#messages);
		this.#composer.focus();
	}

	/** Paints the active conversation and lands at its most recent turn. */
	start() {
		this.render();
		this.#scrollToBottom();
	}

	open(id) {
		this.#store.select(id);
		this.start();
	}

	async send(text) {
		this.#store.append('user', text);
		this.render();
		this.#scrollToBottom();
		await this.#generate();
	}

	#bind() {
		this.#messages.addEventListener('click', (event) => {
			const button = event.target.closest('[data-action]');
			if (!button) return;
			this.#act(button);
		});
	}

	#act(button) {
		const actions = {
			'copy-code': () => this.#copy(button.closest('.code-block').querySelector('code').textContent, button),
			copy: () => this.#copy(this.#store.active.messages[Number(button.closest('.turn').dataset.index)].content, button),
			retry: () => this.#retry(),
			rate: () => button.classList.toggle('is-on'),
		};
		actions[button.dataset.action]();
	}

	async #retry() {
		this.#store.dropLast();
		this.render();
		await this.#generate();
	}

	async #generate() {
		this.#composer.setBusy(true);
		this.#store.append('assistant', '');
		this.#messages.insertAdjacentHTML(
			'beforeend',
			this.#turn({ role: 'assistant', content: '' }, this.#store.active.messages.length - 1, true),
		);

		const pending = this.#messages.lastElementChild;
		Icons.paint(pending);
		const prose = pending.querySelector('.prose');
		const history = this.#store.active.messages.slice(0, -1);
		let text = '';

		for await (const fragment of this.#client.stream(this.#composer.model, history)) {
			text += fragment;
			prose.innerHTML = this.#renderer.render(text);
			this.#keepPinned();
		}

		this.#store.replaceLast(text);
		this.#composer.setBusy(false);
		this.render();
	}

	#turn(message, index, streaming = false) {
		if (message.role === 'user') {
			return `<article class="turn turn-user" data-index="${index}">`
				+ `<div class="bubble">${this.#renderer.escape(message.content)}</div></article>`;
		}

		return `<article class="turn turn-assistant" data-index="${index}">`
			+ `<div class="prose${streaming ? ' is-streaming' : ''}">${this.#renderer.render(message.content)}</div>`
			+ '<div class="turn-actions">'
			+ '<button type="button" class="icon-btn" data-action="copy" data-icon="copy" title="Copy"></button>'
			+ '<button type="button" class="icon-btn" data-action="retry" data-icon="retry" title="Retry"></button>'
			+ '<button type="button" class="icon-btn" data-action="rate" data-icon="thumbUp" title="Good response"></button>'
			+ '<button type="button" class="icon-btn" data-action="rate" data-icon="thumbDown" title="Bad response"></button>'
			+ '</div></article>';
	}

	async #copy(text, button) {
		const original = button.innerHTML;
		await navigator.clipboard.writeText(text);
		button.textContent = 'Copied';
		setTimeout(() => { button.innerHTML = original; }, 1200);
	}

	#greeting() {
		const hour = new Date().getHours();
		const match = [...GREETINGS].reverse().find(([from]) => hour >= from);
		return match ? match[1] : 'Good evening';
	}

	#keepPinned() {
		const distance = this.#thread.scrollHeight - this.#thread.scrollTop - this.#thread.clientHeight;
		if (distance > PIN_THRESHOLD) return;
		this.#scrollToBottom();
	}

	#scrollToBottom() {
		this.#thread.scrollTop = this.#thread.scrollHeight;
	}
}
