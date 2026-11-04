const MAX_ROWS_HEIGHT = 320;

/** The prompt box: auto-growing textarea, model picker and send button. */
export class Composer {
	#form;
	#textarea;
	#send;
	#modelButton;
	#modelLabel;
	#modelMenu;
	#onSubmit;
	#busy = false;

	constructor(form, onSubmit) {
		this.#form = form;
		this.#textarea = form.querySelector('.composer-input');
		this.#send = form.querySelector('.composer-send');
		this.#modelButton = form.querySelector('.model-button');
		this.#modelLabel = form.querySelector('.model-label');
		this.#modelMenu = form.querySelector('.model-menu');
		this.#onSubmit = onSubmit;
		this.#bind();
	}

	get element() {
		return this.#form;
	}

	get model() {
		return this.#modelButton.dataset.model;
	}

	setModels(names) {
		this.#modelMenu.innerHTML = names
			.map((name) => `<button type="button" role="option" data-model="${name}">${this.#label(name)}</button>`)
			.join('');
		this.#selectModel(names[0]);
	}

	setBusy(busy) {
		this.#busy = busy;
		this.#textarea.disabled = busy;
		this.#refreshSend();
	}

	focus() {
		this.#textarea.focus();
	}

	#bind() {
		this.#textarea.addEventListener('input', () => {
			this.#grow();
			this.#refreshSend();
		});

		this.#textarea.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter' || event.shiftKey) return;
			event.preventDefault();
			this.#submit();
		});

		this.#form.addEventListener('submit', (event) => {
			event.preventDefault();
			this.#submit();
		});

		this.#modelButton.addEventListener('click', () => {
			this.#modelMenu.hidden = !this.#modelMenu.hidden;
		});

		this.#modelMenu.addEventListener('click', (event) => {
			const option = event.target.closest('[data-model]');
			if (!option) return;
			this.#selectModel(option.dataset.model);
			this.#modelMenu.hidden = true;
		});

		document.addEventListener('click', (event) => {
			if (this.#form.contains(event.target)) return;
			this.#modelMenu.hidden = true;
		});
	}

	#submit() {
		const text = this.#textarea.value.trim();
		if (!text || this.#busy) return;
		this.#textarea.value = '';
		this.#grow();
		this.#refreshSend();
		this.#onSubmit(text);
	}

	#selectModel(name) {
		this.#modelButton.dataset.model = name;
		this.#modelLabel.textContent = this.#label(name);
		this.#modelMenu.querySelectorAll('[data-model]').forEach((option) => {
			option.setAttribute('aria-selected', String(option.dataset.model === name));
		});
	}

	#label(name) {
		return name
			.replace(/:latest$/, '')
			.split('-')
			.map((part) => (/^[a-z]/.test(part) ? part[0].toUpperCase() + part.slice(1) : part))
			.join(' ');
	}

	#grow() {
		this.#textarea.style.height = 'auto';
		this.#textarea.style.height = `${Math.min(this.#textarea.scrollHeight, MAX_ROWS_HEIGHT)}px`;
	}

	#refreshSend() {
		this.#send.disabled = this.#busy || !this.#textarea.value.trim();
	}
}
