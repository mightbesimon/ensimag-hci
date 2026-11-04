/** Left rail: navigation rows, the Recents group and the account row.
 *
 *  claude.ai's Search row opens a command palette that searches chat *titles*;
 *  it is inert here. There is deliberately no way to search or outline within a
 *  conversation: that is the capability the study's experimental condition adds,
 *  so the baseline must not have it. */
export class Sidebar {
	#element;
	#store;
	#list;
	#onSelect;

	constructor(element, store, onSelect) {
		this.#element = element;
		this.#store = store;
		this.#list = element.querySelector('.recents-list');
		this.#onSelect = onSelect;
		this.#bind();
	}

	render() {
		const active = this.#store.active;

		this.#list.innerHTML = this.#store.conversations
			.map((conversation) => '<li><button type="button" class="row'
				+ `${active && active.id === conversation.id ? ' is-active' : ''}" data-id="${conversation.id}">`
				+ `<span class="row-label">${this.#escape(conversation.title)}</span></button></li>`)
			.join('');

		this.#element.querySelector('.user-name').textContent = this.#store.user.name;
		this.#element.querySelector('.plan').textContent = this.#store.user.plan;
	}

	#bind() {
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
