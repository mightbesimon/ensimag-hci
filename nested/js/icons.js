const stroke = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';

const svg = (body, size = 20) =>
	`<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;

export const Icons = Object.freeze({
	// The Claude mark, traced from the published logo outline.
	mark: (size = 20) =>
		`<svg viewBox="0 0 100 100" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">`
		+ '<path d="m19.6 66.5 19.7-11 .3-1-.3-.5h-1l-3.3-.2-11.2-.3L14 53l-9.5-.5-2.4-.5L0 49l.2-1.5 2-1.3 2.9.2 6.3.5 9.5.6 6.9.4L38 49.1h1.6l.2-.7-.5-.4-.4-.4L29 41l-10.6-7-5.6-4.1-3-2-1.5-2-.6-4.2 2.7-3 3.7.3.9.2 3.7 2.9 8 6.1L37 36l1.5 1.2.6-.4.1-.3-.7-1.1L33 25l-6-10.4-2.7-4.3-.7-2.6c-.3-1-.4-2-.4-3l3-4.2L28 0l4.2.6L33.8 2l2.6 6 4.1 9.3L47 29.9l2 3.8 1 3.4.3 1h.7v-.5l.5-7.2 1-8.7 1-11.2.3-3.2 1.6-3.8 3-2L61 2.6l2 2.9-.3 1.8-1.1 7.7L59 27.1l-1.5 8.2h.9l1-1.1 4.1-5.4 6.9-8.6 3-3.5L77 13l2.3-1.8h4.3l3.1 4.7-1.4 4.9-4.4 5.6-3.7 4.7-5.3 7.1-3.2 5.7.3.4h.7l12-2.6 6.4-1.1 7.6-1.3 3.5 1.6.4 1.6-1.4 3.4-8.2 2-9.6 2-14.3 3.3-.2.1.2.3 6.4.6 2.8.2h6.8l12.6 1 3.3 2 1.9 2.7-.3 2-5.1 2.6-6.8-1.6-16-3.8-5.4-1.3h-.8v.4l4.6 4.5 8.3 7.5L89 80.1l.5 2.4-1.3 2-1.4-.2-9.2-7-3.6-3-8-6.8h-.5v.7l1.8 2.7 9.8 14.7.5 4.5-.7 1.4-2.6 1-2.7-.6-5.8-8-6-9-4.7-8.2-.5.4-2.9 30.2-1.3 1.5-3 1.2-2.5-2-1.4-3 1.4-6.2 1.6-8 1.3-6.4 1.2-7.9.7-2.6v-.2H49L43 72l-9 12.3-7.2 7.6-1.7.7-3-1.5.3-2.8L24 86l10-12.8 6-7.9 4-4.6-.1-.5h-.3L17.2 77.4l-4.7.6-2-2 .2-3 1-1 8-5.5Z"/></svg>',

	sidebar: svg(`<rect ${stroke} x="3" y="4.5" width="18" height="15" rx="3"/><path ${stroke} d="M9 4.5v15"/>`),
	compose: svg(`<path ${stroke} d="M4.5 19.5h15M6 15.2 15.4 5.8a2 2 0 112.8 2.8L8.8 18 5 19l1-3.8z"/>`),
	search: svg(`<circle ${stroke} cx="11" cy="11" r="6.5"/><path ${stroke} d="m16 16 4 4"/>`),
	projects: svg(`<path ${stroke} d="M3.5 7.5a2 2 0 012-2h3.1l2 2.2h8a2 2 0 012 2v7.8a2 2 0 01-2 2h-13a2 2 0 01-2-2z"/>`),
	artifacts: svg(`<rect ${stroke} x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path ${stroke} d="M3.5 9.5h17"/>`),
	scheduled: svg(`<circle ${stroke} cx="12" cy="12" r="8"/><path ${stroke} d="M12 7.5V12l3 2"/>`),
	design: svg(`<circle ${stroke} cx="12" cy="12" r="8"/><circle ${stroke} cx="12" cy="12" r="2.5"/>`),
	customize: svg(`<path ${stroke} d="M5 8h9M17 8h2M5 16h2M10 16h9"/><circle ${stroke} cx="15.5" cy="8" r="1.8"/><circle ${stroke} cx="8.5" cy="16" r="1.8"/>`),
	downloads: svg(`<path ${stroke} d="M12 4.5v10M8 11l4 4 4-4M5 18.5h14"/>`),

	back: svg(`<path ${stroke} d="m14.5 5.5-6.5 6.5 6.5 6.5"/>`),
	caret: svg(`<path ${stroke} d="m9 6 6 6-6 6"/>`, 14),
	collapseAll: svg(`<path ${stroke} d="M8 6.5 12 10.5 16 6.5M8 17.5 12 13.5 16 17.5"/>`, 18),
	expandAll: svg(`<path ${stroke} d="M8 10.5 12 6.5 16 10.5M8 13.5 12 17.5 16 13.5"/>`, 18),
	chevron: svg(`<path ${stroke} d="m6 9 6 6 6-6"/>`, 12),
	scrollDown: svg(`<path ${stroke} d="m6 9.5 6 6 6-6"/>`, 18),
	more: svg(`<circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/>`, 16),
	share: svg(`<path ${stroke} d="M12 15.5V4.5M8.5 8 12 4.5 15.5 8M5.5 13v5a1.5 1.5 0 001.5 1.5h10a1.5 1.5 0 001.5-1.5v-5"/>`),

	plus: svg(`<path ${stroke} d="M12 5.5v13M5.5 12h13"/>`, 16),
	mic: svg(`<rect ${stroke} x="9.5" y="3.5" width="5" height="10" rx="2.5"/><path ${stroke} d="M6 11.5a6 6 0 0012 0M12 17.5v3"/>`, 16),
	send: svg(`<path ${stroke} d="M12 19V5.5M6 11l6-5.5 6 5.5"/>`),

	copy: svg(`<rect ${stroke} x="9" y="9" width="11" height="11" rx="2.5"/><path ${stroke} d="M15 5.5H6.5A2 2 0 004.5 7.5V16"/>`, 16),
	readAloud: svg(`<path ${stroke} d="M11 5.5 6.5 9H4v6h2.5L11 18.5z"/><path ${stroke} d="M14.5 9.5a3.5 3.5 0 010 5M17 7a7 7 0 010 10"/>`, 16),
	thumbUp: svg(`<path ${stroke} d="M7 20V10l4-6 1 1v5h5.5a2 2 0 012 2.4l-1.3 6A2 2 0 0116.2 20z"/>`, 16),
	thumbDown: svg(`<path ${stroke} d="M17 4v10l-4 6-1-1v-5H6.5a2 2 0 01-2-2.4l1.3-6A2 2 0 017.8 4z"/>`, 16),
	retry: svg(`<path ${stroke} d="M19.5 12a7.5 7.5 0 11-2.6-5.7"/><path ${stroke} d="M19.5 4.5V8H16"/>`, 16),

	/** Fills every `data-icon="name"` element under `root`, so the markup never
	 *  carries a second copy of an SVG. */
	paint(root) {
		root.querySelectorAll('[data-icon]').forEach((slot) => {
			const icon = Icons[slot.dataset.icon];
			slot.innerHTML = typeof icon === 'function' ? icon() : icon;
		});
	},
});
