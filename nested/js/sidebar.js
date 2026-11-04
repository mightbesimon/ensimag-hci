/** Left rail. Holds two panes on a sliding track: the chat list, and the table
 *  of contents for the open conversation.
 *
 *  Opening a conversation slides the chat list away and reveals its outline, so
 *  the rail navigates *within* a conversation rather than between conversations.
 *  That is the capability under test; the baseline condition has no equivalent. */
export class Sidebar {
	#element;
	#store;
	#body;
	#list;
	#panes;
	#onSelect;

	constructor(element, store, onSelect) {
		this.#element = element;
		this.#store = store;
		this.#body = element.querySelector('.sidebar-body');
		this.#list = element.querySelector('.recents-list');
		this.#panes = {
			chats: element.querySelector('.pane-chats'),
			contents: element.querySelector('.pane-contents'),
		};
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

	show(pane) {
		this.#body.classList.toggle('is-contents', pane === 'contents');
		Object.entries(this.#panes).forEach(([name, element]) => {
			element.inert = name !== pane;
		});
	}

	#bind() {
		this.#list.addEventListener('click', (event) => {
			const button = event.target.closest('[data-id]');
			if (!button) return;
			this.#onSelect(button.dataset.id);
		});

		this.#element.querySelector('.contents-back').addEventListener('click', () => this.show('chats'));
	}

	#escape(text) {
		const node = document.createElement('span');
		node.textContent = text;
		return node.innerHTML;
	}
}
