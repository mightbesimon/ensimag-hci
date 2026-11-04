import { ChatView } from './chatview.js';
import { Composer } from './composer.js';
import { ConversationStore } from './store.js';
import { Icons } from './icons.js';
import { MarkdownRenderer } from './markdown.js';
import { OllamaClient } from './ollamaclient.js';
import { OutlineClient } from './outlineclient.js';
import { Sidebar } from './sidebar.js';
import { TableOfContents } from './contents.js';

const elements = {
	app: document.getElementById('app'),
	thread: document.getElementById('thread'),
	welcome: document.getElementById('welcome'),
	messages: document.getElementById('messages'),
	dock: document.getElementById('dock'),
	title: document.getElementById('chat-title'),
	jump: document.getElementById('jump'),
};

Icons.paint(document.body);

const store = new ConversationStore();
await store.load();

const client = new OllamaClient();
const composer = new Composer(document.getElementById('composer'), (text) => view.send(text));
const sidebar = new Sidebar(document.getElementById('sidebar'), store, (id) => {
	view.open(id);
	sidebar.show('contents');
});
const contents = new TableOfContents(
	document.querySelector('.pane-contents'),
	new OutlineClient(),
	elements,
);
const view = new ChatView(elements, store, client, new MarkdownRenderer(), composer, {
	onUpdate: (conversation) => (conversation ? contents.show(conversation, composer.model) : contents.clear()),
	onScroll: () => contents.markPosition(),
});

// Only the sidebar reacts to store changes: the chat view repaints explicitly,
// so a streaming response is not wiped out mid-flight.
store.onChange(() => sidebar.render());

composer.setModels(await client.models());

document.getElementById('new-chat').addEventListener('click', () => {
	store.startNew();
	view.render();
	sidebar.show('chats');
});

for (const id of ['collapse', 'expand']) {
	document.getElementById(id).addEventListener('click', () => {
		elements.app.classList.toggle('is-collapsed');
	});
}

sidebar.render();
sidebar.show(store.active ? 'contents' : 'chats');
view.start();
