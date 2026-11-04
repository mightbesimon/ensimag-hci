import { Icons } from './icons.js';

const PIN_THRESHOLD = 120;

const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)');

const UNITS = Object.freeze([
	['year', 31536000],
	['month', 2592000],
	['day', 86400],
	['hour', 3600],
	['minute', 60],
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
	#jump;

	constructor(elements, store, client, renderer, composer) {
		this.#thread = elements.thread;
		this.#welcome = elements.welcome;
		this.#messages = elements.messages;
		this.#dock = elements.dock;
		this.#title = elements.title;
		this.#jump = elements.jump;
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

		this.#composer.setPlaceholder(conversation ? 'thread' : 'fresh');

		if (!conversation) {
			this.#welcome.querySelector('.composer-slot').append(this.#composer.element);
			this.#messages.innerHTML = '';
			this.#composer.focus();
			this.#refreshJump();
			return;
		}

		this.#dock.querySelector('.composer-slot').append(this.#composer.element);
		this.#messages.innerHTML = conversation.messages
			.map((message, index) => this.#turn(message, index, conversation)).join('');
		Icons.paint(this.#messages);
		this.#composer.focus();
		this.#refreshJump();
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

		this.#thread.addEventListener('scroll', () => this.#refreshJump(), { passive: true });
		this.#jump.addEventListener('click', () => this.#scrollToBottom(true));
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
		const conversation = this.#store.append('assistant', '');
		this.#messages.insertAdjacentHTML(
			'beforeend',
			this.#turn({ role: 'assistant', content: '' }, conversation.messages.length - 1, conversation, true),
		);

		const pending = this.#messages.lastElementChild;
		Icons.paint(pending);
		const prose = pending.querySelector('.prose');
		const history = conversation.messages.slice(0, -1);
		let text = '';

		for await (const fragment of this.#client.stream(this.#composer.model, history)) {
			text += fragment;
			prose.innerHTML = this.#renderer.render(text);
			this.#followTail();
		}

		this.#store.replaceLast(text);
		this.#composer.setBusy(false);
		this.render();
	}

	#turn(message, index, conversation, streaming = false) {
		const when = this.#relative(message.at || conversation.updated);

		if (message.role === 'user') {
			return `<article class="turn turn-user" data-index="${index}">`
				+ `<div class="bubble">${this.#renderer.escape(message.content)}</div>`
				+ '<div class="turn-actions">'
				+ `<span class="turn-time">${when}</span>`
				+ this.#action('copy', 'copy', 'Copy')
				+ '</div></article>';
		}

		return `<article class="turn turn-assistant" data-index="${index}">`
			+ `<div class="prose${streaming ? ' is-streaming' : ''}">${this.#renderer.render(message.content)}</div>`
			+ '<div class="turn-actions">'
			+ this.#action('copy', 'copy', 'Copy')
			+ this.#action('', 'readAloud', 'Read aloud')
			+ this.#action('rate', 'thumbUp', 'Good response')
			+ this.#action('rate', 'thumbDown', 'Bad response')
			+ this.#action('retry', 'retry', 'Retry')
			+ `<span class="turn-time">${when}</span>`
			+ '</div></article>';
	}

	#action(action, icon, label) {
		return `<button type="button" class="icon-btn"${action ? ` data-action="${action}"` : ''}`
			+ ` data-icon="${icon}" aria-label="${label}" title="${label}"></button>`;
	}

	#relative(iso) {
		const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
		const [unit, size] = UNITS.find(([, span]) => Math.abs(seconds) >= span) || ['second', 1];
		return RELATIVE.format(Math.round(seconds / size), unit);
	}

	async #copy(text, button) {
		const original = button.innerHTML;
		await navigator.clipboard.writeText(text);
		button.textContent = 'Copied';
		setTimeout(() => { button.innerHTML = original; }, 1200);
	}

	/** Keeps a streaming reply in view, unless the reader has scrolled away. */
	#followTail() {
		if (this.#atBottom()) this.#scrollToBottom();
		this.#refreshJump();
	}

	#atBottom() {
		return this.#thread.scrollHeight - this.#thread.scrollTop - this.#thread.clientHeight <= PIN_THRESHOLD;
	}

	#refreshJump() {
		const show = Boolean(this.#store.active) && !this.#atBottom();
		this.#jump.classList.toggle('is-visible', show);
		this.#jump.inert = !show;
	}

	#scrollToBottom(smooth = false) {
		this.#thread.scrollTo({
			top: this.#thread.scrollHeight,
			behavior: smooth && !REDUCED_MOTION.matches ? 'smooth' : 'auto',
		});
		this.#refreshJump();
	}
}
