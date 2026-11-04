/** Left rail: new chat, chat search and the Recents list.
 *
 *  Search filters chat titles only, matching claude.ai. There is deliberately no
 *  way to search or outline *within* a conversation: that is the capability the
 *  study's experimental condition adds, so the baseline must not have it. */
export class Sidebar {
	#element;
	#store;
	#list;
	#search;
	#onSelect;

	constructor(element, store, onSelect) {
		this.#element = element;
		this.#store = store;
		this.#list = element.querySelector('.recents-list');
		this.#search = element.querySelector('.sidebar-search-input');
		this.#onSelect = onSelect;
		this.#bind();
	}

	render() {
		const active = this.#store.active;
		const query = this.#search.value.trim().toLowerCase();
		const matches = this.#store.conversations
			.filter((conversation) => conversation.title.toLowerCase().includes(query));

		this.#list.innerHTML = matches
			.map((conversation) => `<li><button type="button" data-id="${conversation.id}"`
				+ `${active && active.id === conversation.id ? ' class="is-active"' : ''}>`
				+ `${this.#escape(conversation.title)}</button></li>`)
			.join('');

		this.#element.querySelector('.user-name').textContent = this.#store.user.name;
		this.#element.querySelector('.user-plan').textContent = this.#store.user.plan;
	}

	#bind() {
		this.#search.addEventListener('input', () => this.render());
		this.#list.addEventListener('click', (event) => {
			const button = event.target.closest('[data-id]');
			if (!button) return;
			this.#onSelect(button.dataset.id);
		});
	}

	#escape(text) {
		const node = document.createElement('span');
		node.textContent = text;
		return node.innerHTML;
	}
}
