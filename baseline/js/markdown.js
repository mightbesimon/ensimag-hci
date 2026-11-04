const ESCAPES = Object.freeze({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' });

// Private-use code point, so a placeholder can never collide with real prose.
const SENTINEL = '\uE000';

export class MarkdownRenderer {
	/** Supported: headings, bold, italic, inline and fenced code, unordered and
	 *  ordered lists, blockquotes, horizontal rules, links. No tables, no nested
	 *  lists, no images. */
	render(text) {
		return this.#blocks(text.split('\n')).join('');
	}

	escape(text) {
		return text.replace(/[&<>"]/g, (character) => ESCAPES[character]);
	}

	#blocks(lines) {
		const html = [];
		let paragraph = [];
		let list = null;

		const flushParagraph = () => {
			if (!paragraph.length) return;
			html.push(`<p>${this.#inline(paragraph.join(' '))}</p>`);
			paragraph = [];
		};
		const flushList = () => {
			if (!list) return;
			const items = list.items.map((item) => `<li>${this.#inline(item)}</li>`).join('');
			html.push(`<${list.tag}>${items}</${list.tag}>`);
			list = null;
		};
		const flush = () => {
			flushParagraph();
			flushList();
		};

		for (let index = 0; index < lines.length; index += 1) {
			const line = lines[index];
			const fence = line.match(/^```(\w*)\s*$/);

			if (fence) {
				flush();
				const body = [];
				index += 1;
				while (index < lines.length && !/^```/.test(lines[index])) {
					body.push(lines[index]);
					index += 1;
				}
				html.push(this.#codeBlock(fence[1], body.join('\n')));
				continue;
			}

			if (!line.trim()) {
				flush();
				continue;
			}

			const heading = line.match(/^(#{1,4})\s+(.*)$/);
			if (heading) {
				flush();
				html.push(`<h${heading[1].length}>${this.#inline(heading[2])}</h${heading[1].length}>`);
				continue;
			}

			if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
				flush();
				html.push('<hr>');
				continue;
			}

			const quote = line.match(/^>\s?(.*)$/);
			if (quote) {
				flush();
				html.push(`<blockquote>${this.#inline(quote[1])}</blockquote>`);
				continue;
			}

			const bullet = line.match(/^\s*[-*]\s+(.*)$/);
			const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
			if (bullet || numbered) {
				flushParagraph();
				const tag = bullet ? 'ul' : 'ol';
				if (!list || list.tag !== tag) {
					flushList();
					list = { tag, items: [] };
				}
				list.items.push((bullet || numbered)[1]);
				continue;
			}

			flushList();
			paragraph.push(line.trim());
		}

		flush();
		return html;
	}

	#codeBlock(language, body) {
		return [
			`<figure class="code-block">`,
			`<figcaption><span>${this.escape(language || 'text')}</span>`,
			`<button type="button" class="code-copy" data-action="copy-code">Copy</button></figcaption>`,
			`<pre><code>${this.escape(body)}</code></pre></figure>`,
		].join('');
	}

	#inline(text) {
		// Inline code is lifted out first so its contents are never read as markup.
		const spans = [];
		const lifted = text.replace(/`([^`]+)`/g, (match, code) => {
			spans.push(`<code>${this.escape(code)}</code>`);
			return `${SENTINEL}${spans.length - 1}${SENTINEL}`;
		});

		const marked = this.escape(lifted)
			.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
			.replace(/(^|\s)_([^_]+)_/g, '$1<em>$2</em>');

		return marked.replace(
			new RegExp(`${SENTINEL}(\\d+)${SENTINEL}`, 'g'),
			(match, index) => spans[Number(index)],
		);
	}
}
