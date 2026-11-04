const STORAGE_KEY = 'hci-baseline';
const SEED_URL = 'seed/conversation.json';

/** Holds the conversations and persists them to localStorage.
 *
 *  The seed file is the single source of truth for the starting state: when its
 *  `version` differs from the stored copy the store is rebuilt from it, so every
 *  participant begins a session from identical data. */
export class ConversationStore {
	#state = null;
	#listeners = [];

	async load() {
		const seed = await fetch(SEED_URL).then((response) => response.json());
		const stored = this.#read();
		this.#state = stored && stored.version === seed.version ? stored : this.#fromSeed(seed);
		this.#save();
	}

	onChange(listener) {
		this.#listeners.push(listener);
	}

	get user() {
		return this.#state.user;
	}

	get conversations() {
		return [...this.#state.conversations].sort((left, right) => right.updated.localeCompare(left.updated));
	}

	get active() {
		return this.#state.conversations.find((conversation) => conversation.id === this.#state.activeId) || null;
	}

	select(id) {
		this.#state.activeId = id;
		this.#commit();
	}

	startNew() {
		this.#state.activeId = null;
		this.#commit();
	}

	/** Creates the conversation on the first message, the way Claude does. */
	append(role, content) {
		const conversation = this.active || this.#create(content);
		conversation.messages.push({ role, content, at: new Date().toISOString() });
		conversation.updated = new Date().toISOString();
		this.#commit();
		return conversation;
	}

	replaceLast(content) {
		const messages = this.active.messages;
		messages[messages.length - 1].content = content;
		this.#save();
	}

	dropLast() {
		this.active.messages.pop();
		this.#commit();
	}

	#create(firstMessage) {
		const conversation = {
			id: `chat-${Date.now()}`,
			title: this.#titleFrom(firstMessage),
			updated: new Date().toISOString(),
			messages: [],
		};
		this.#state.conversations.push(conversation);
		this.#state.activeId = conversation.id;
		return conversation;
	}

	#titleFrom(text) {
		const trimmed = text.trim().replace(/\s+/g, ' ');
		return trimmed.length > 48 ? `${trimmed.slice(0, 48)}...` : trimmed;
	}

	#fromSeed(seed) {
		return {
			version: seed.version,
			user: seed.user,
			activeId: null,
			conversations: structuredClone(seed.conversations),
		};
	}

	#read() {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : null;
	}

	#save() {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#state));
	}

	#commit() {
		this.#save();
		this.#listeners.forEach((listener) => listener());
	}
}
