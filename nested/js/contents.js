import { Icons } from './icons.js';

// How far below the top of the thread a turn must sit before it counts as the
// reader's current position.
const CURRENT_OFFSET = 80;

/** The table of contents pane: the open conversation's topics and the key
 *  points inside each one, in the manner of Google Docs' outline. */
export class TableOfContents {
	#element;
	#client;
	#thread;
	#messages;
	#list;
	#title;
	#search;
	#fold;
	#topics = [];
	#collapsed = new Set();
	#conversationId = null;
	#signature = null;
	#pending = false;

	constructor(element, client, { thread, messages }) {
		this.#element = element;
		this.#client = client;
		this.#thread = thread;
		this.#messages = messages;
		this.#list = element.querySelector('.contents-list');
		this.#title = element.querySelector('.contents-title');
		this.#search = element.querySelector('.contents-search-input');
		this.#fold = element.querySelector('.contents-fold');
		this.#bind();
	}

	async show(conversation, model) {
		if (conversation.id !== this.#conversationId) {
			this.#conversationId = conversation.id;
			this.#collapsed.clear();
			this.#search.value = '';
		}
		this.#title.textContent = conversation.title;

		// Outlining can mean a round trip to a local model, so only ask again
		// once the conversation has actually gained a turn.
		const signature = `${conversation.id}:${model}:${this.#prompts(conversation)}`;
		if (signature !== this.#signature) {
			this.#signature = signature;
			this.#topics = await this.#client.outline(conversation.messages, model);
		}
		this.#render();
	}

	#prompts(conversation) {
		return conversation.messages.filter((message) => message.role === 'user').length;
	}

	clear() {
		this.#conversationId = null;
		this.#signature = null;
		this.#topics = [];
		this.#collapsed.clear();
		this.#search.value = '';
		this.#render();
	}

	/** Marks the topic or point the reader is currently inside. */
	markPosition() {
		if (this.#pending) return;
		this.#pending = true;
		requestAnimationFrame(() => {
			this.#pending = false;
			this.#paintPosition();
		});
	}

	#bind() {
		this.#search.addEventListener('input', () => this.#render());
		this.#fold.addEventListener('click', () => this.#toggleAll());

		this.#list.addEventListener('click', (event) => {
			const caret = event.target.closest('[data-topic]');
			if (caret) {
				this.#toggle(Number(caret.dataset.topic));
				return;
			}

			const row = event.target.closest('[data-anchor]');
			if (!row) return;
			const target = this.#messages.querySelector(row.dataset.anchor);
			if (!target) return;
			// A pinned prompt reports where it is stuck, not where it sits in the
			// flow, so scrolling to it lands wrong. Scroll its exchange instead.
			(target.closest('.exchange') || target).scrollIntoView({ block: 'start', behavior: 'smooth' });
		});
	}

	#toggle(index) {
		if (this.#collapsed.has(index)) this.#collapsed.delete(index);
		else this.#collapsed.add(index);
		this.#settle();
	}

	/** Collapses every topic, or expands them all once they already are. */
	#toggleAll() {
		const foldable = this.#foldable();
		if (foldable.every((index) => this.#collapsed.has(index))) this.#collapsed.clear();
		else foldable.forEach((index) => this.#collapsed.add(index));
		this.#settle();
	}

	/** Re-applies collapse state without rebuilding, so the rows can transition. */
	#settle() {
		this.#applyCollapse();
		this.#refreshFold();
		this.#paintPosition();
	}

	#foldable() {
		return this.#topics
			.map((topic, index) => (topic.points.length ? index : null))
			.filter((index) => index !== null);
	}

	#render() {
		const query = this.#search.value.trim().toLowerCase();

		this.#list.innerHTML = this.#visible(query)
			.map(({ topic, index, points }) => `<li class="contents-group" data-group="${index}">`
				+ this.#topicRow(topic, index)
				+ (points.length
					? `<div class="contents-points"><ul>${points.map((point) => this.#pointRow(point)).join('')}</ul></div>`
					: '')
				+ '</li>')
			.join('');

		Icons.paint(this.#list);
		this.#applyCollapse();
		this.#refreshFold();

		this.#element.classList.toggle('is-empty', !this.#list.children.length);
		this.#paintPosition();
	}

	/** Collapse is a class, not a rebuild, so the open and close can animate.
	 *  A filter overrides it: a match inside a collapsed topic must still show. */
	#applyCollapse() {
		const filtering = Boolean(this.#search.value.trim());
		this.#list.querySelectorAll('[data-group]').forEach((group) => {
			const collapsed = !filtering && this.#collapsed.has(Number(group.dataset.group));
			group.classList.toggle('is-collapsed', collapsed);
			const caret = group.querySelector('.contents-caret[data-topic]');
			if (caret) caret.setAttribute('aria-expanded', String(!collapsed));
		});
	}

	#refreshFold() {
		const collapsed = this.#allCollapsed();
		this.#fold.disabled = !this.#foldable().length;
		this.#fold.innerHTML = collapsed ? Icons.expandAll : Icons.collapseAll;
		this.#fold.setAttribute('aria-label', collapsed ? 'Expand all topics' : 'Collapse all topics');
	}

	#allCollapsed() {
		const foldable = this.#foldable();
		return Boolean(foldable.length) && foldable.every((index) => this.#collapsed.has(index));
	}

	/** A filter keeps a topic whose own title matches along with all its points;
	 *  a topic kept only because a point matched shows just the matching ones. */
	#visible(query) {
		const all = this.#topics.map((topic, index) => ({ topic, index, points: topic.points }));
		if (!query) return all;

		return all
			.map((entry) => {
				if (entry.topic.title.toLowerCase().includes(query)) return entry;
				const points = entry.points.filter((point) => point.title.toLowerCase().includes(query));
				return points.length ? { ...entry, points } : null;
			})
			.filter(Boolean);
	}

	#topicRow(topic, index) {
		const caret = topic.points.length
			? `<button type="button" class="contents-caret" data-topic="${index}" aria-expanded="true"`
				+ ` aria-label="Collapse or expand ${this.#escape(topic.title)}">`
				+ '<span data-icon="caret"></span></button>'
			: '<span class="contents-caret"></span>';

		return `<div class="contents-item is-topic">${caret}`
			+ `<button type="button" class="row contents-topic" data-anchor="${this.#anchor(topic.start)}">`
			+ `<span class="row-label">${this.#escape(topic.title)}</span></button></div>`;
	}

	#pointRow(point) {
		return '<li class="contents-item is-point">'
			+ `<button type="button" class="row contents-point" data-anchor="${this.#anchor(point.start)}">`
			+ `<span class="row-label">${this.#escape(point.title)}</span></button></li>`;
	}

	#anchor(start) {
		return `.turn[data-index=&quot;${start}&quot;]`;
	}

	#paintPosition() {
		const items = [...this.#list.querySelectorAll('.contents-item')]
			.filter((item) => !item.closest('.is-collapsed'));
		const limit = this.#thread.getBoundingClientRect().top + CURRENT_OFFSET;
		let current = null;

		for (const item of items) {
			const row = item.querySelector('[data-anchor]');
			const target = row && this.#messages.querySelector(row.dataset.anchor);
			if (target && target.getBoundingClientRect().top <= limit) current = item;
		}

		items.forEach((item) => item.classList.toggle('is-current', item === current));
	}

	#escape(text) {
		const node = document.createElement('span');
		node.textContent = text;
		return node.innerHTML;
	}
}
