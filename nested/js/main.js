import { ChatView } from './chatview.js';
import { Composer } from './composer.js';
import { ConversationStore } from './store.js';
import { Icons } from './icons.js';
import { MarkdownRenderer } from './markdown.js';
import { OllamaClient } from './ollamaclient.js';
import { Sidebar } from './sidebar.js';

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
const sidebar = new Sidebar(document.getElementById('sidebar'), store, (id) => view.open(id));
const view = new ChatView(elements, store, client, new MarkdownRenderer(), composer);

// Only the sidebar reacts to store changes: the chat view repaints explicitly,
// so a streaming response is not wiped out mid-flight.
store.onChange(() => sidebar.render());

composer.setModels(await client.models());

document.getElementById('new-chat').addEventListener('click', () => {
	store.startNew();
	view.render();
});

for (const id of ['collapse', 'expand']) {
	document.getElementById(id).addEventListener('click', () => {
		elements.app.classList.toggle('is-collapsed');
	});
}

sidebar.render();
view.start();
