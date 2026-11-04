const stroke = 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';

const svg = (body, size = 18) =>
	`<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;

// Ten tapered spokes radiating from the centre, the shape of the Claude mark.
const spokes = Array.from({ length: 10 }, (unused, index) =>
	`<path d="M0 -11 L1.7 -3.4 L0 0 L-1.7 -3.4 Z" transform="rotate(${index * 36})"/>`).join('');

export const Icons = Object.freeze({
	mark: (size = 20) =>
		`<svg viewBox="-12 -12 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${spokes}</svg>`,
	newChat: svg(`<path ${stroke} d="M12 5v14M5 12h14"/>`),
	search: svg(`<circle ${stroke} cx="11" cy="11" r="6.5"/><path ${stroke} d="M16 16l4 4"/>`),
	sidebar: svg(`<rect ${stroke} x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path ${stroke} d="M9.5 4.5v15"/>`),
	send: svg(`<path ${stroke} d="M12 19V5M6 11l6-6 6 6"/>`),
	plus: svg(`<path ${stroke} d="M12 6v12M6 12h12"/>`),
	tools: svg(`<path ${stroke} d="M14.5 6.5a3.5 3.5 0 014.9 4.9l-9 9-4.9 1 1-4.9z"/>`),
	chevron: svg(`<path ${stroke} d="M7 10l5 5 5-5"/>`, 14),
	copy: svg(`<rect ${stroke} x="9" y="9" width="11" height="11" rx="2"/><path ${stroke} d="M15 5.5H6a1.5 1.5 0 00-1.5 1.5v9"/>`, 16),
	retry: svg(`<path ${stroke} d="M19.5 12a7.5 7.5 0 11-2.6-5.7"/><path ${stroke} d="M19.5 4.5V8h-3.5"/>`, 16),
	thumbUp: svg(`<path ${stroke} d="M7 20V10l4-6 1 1v5h5.5a2 2 0 012 2.4l-1.3 6A2 2 0 0116.2 20z"/>`, 16),
	thumbDown: svg(`<path ${stroke} d="M17 4v10l-4 6-1-1v-5H6.5a2 2 0 01-2-2.4l1.3-6A2 2 0 017.8 4z"/>`, 16),

	/** Fills every `data-icon="name"` element under `root`, so the markup never
	 *  carries a second copy of an SVG. */
	paint(root) {
		root.querySelectorAll('[data-icon]').forEach((slot) => {
			const icon = Icons[slot.dataset.icon];
			slot.innerHTML = typeof icon === 'function' ? icon() : icon;
		});
	},
});
