# ensimag-hci — study interfaces

Both interfaces for the user study, backed by one stub Ollama server that streams
filler text.

| Condition | Directory | URL | What it is |
| --- | --- | --- | --- |
| **A** — control | `baseline/` | <http://127.0.0.1:11434/baseline/> | A reproduction of the claude.ai chat interface. Deliberately offers no way to search or outline *within* a conversation, so finding an earlier idea means scrolling. **Finished — do not change it.** |
| **B** — prototype | `nested/` | <http://127.0.0.1:11434> | The hierarchical-navigation prototype. Adds the table-of-contents rail to the baseline. |

## Run it

```bash
python3 serve.py
```

One server serves both conditions, with the prototype on the root URL. Nothing to install: Python 3 standard library and
plain HTML, CSS and ES modules, no build step and no package manager.

`nested/` is a **copy**, not a shared library: the two conditions must be free to
diverge, so a fix made in one does not reach the other. Port anything worth keeping
across by hand. The one difference already present is the `localStorage` key
(`hci-baseline` vs `hci-nested`), so the two conditions never share browser state.

## Layout

| Path | What it is |
| --- | --- |
| `serve.py` | Entry point. Serves both interfaces and the stub API on one port. |
| `nested/seed/conversation.json` | Same study material as the baseline's copy; keep the two identical. |
| `server/handler.py` | HTTP routing, static mounts, chunked NDJSON streaming. |
| `server/ollama.py` | Ollama payload shapes: `/api/version`, `/api/tags`, `/api/chat`. |
| `server/gibberish.py` | The filler-prose generator. |
| `baseline/index.html` | Interface markup. |
| `baseline/style.css` | Palette and layout, light and dark. |
| `baseline/js/` | One class per file: store, markdown, composer, sidebar, chat view. |
| `baseline/seed/conversation.json` | The conversation participants start from. |
| `nested/` | Condition B, same file layout as `baseline/`. |
| `nested/js/contents.js` | The table-of-contents rail: topics, key points, collapsing. |
| `server/outline.py` | Groups a conversation into topics. Serves `POST /api/outline`. |

Only `baseline/` and `nested/` are reachable over HTTP; the server code, `.git` and
the rest of the repository are not served. `prototype/` is a separate, unrelated piece
of work and is untouched by any of this.

## The table of contents (condition B)

Opening a conversation slides the chat list away and shows its outline, with a
back arrow to return. Two levels: a **topic** is a phase of the conversation
spanning several exchanges, and its **key points** are moments within that
phase. Both jump to a message. Topics collapse individually or all at once, and
the Search field filters topics and points rather than conversations.

The outline comes from `POST /api/outline`, so the interface only ever sees
`{topics: [{title, start, points: [{title, start}]}]}`. A real deployment would
have that endpoint ask the model; the stub writes the seeded conversations'
outlines by hand and groups anything typed live by chance — seeded from the
message text, so the same conversation always yields the same outline.

## The stub backend

`POST /api/chat` and `GET /api/tags` match a real Ollama daemon's request and response
shapes, so any Ollama client works against this server unchanged, and swapping in a real
daemon later needs no change to the interface. Streaming NDJSON is the default;
`"stream": false` returns one JSON object, as Ollama does.

```bash
curl -sN localhost:11434/api/chat -H 'Content-Type: application/json' \
  -d '{"model":"claude-sonnet-4.5:latest","messages":[{"role":"user","content":"hello"}]}'
```

Replies are **deterministic in the prompt**: the same question always produces the same
answer, so a session is reproducible between participants. The text is structured
nonsense with real markdown — headings, lists, bold, inline and fenced code — which is
enough to exercise the interface, and the experimental plan calls for a pre-scripted
conversation rather than live generation anyway.

Two deliberate deviations from a real daemon: `GET /` serves the interface rather than
the string `Ollama is running`, and only the chat surface is implemented (no
`/api/generate`, `/api/pull`, embeddings or model management).

## The seed conversation

Each condition has its own `seed/conversation.json`, holding the same
**placeholder content** — two long conversations (twelve exchanges each) plus
three short ones. Keep the two files identical: if the conditions show different
material the comparison between them is not valid. Replace the
`conversations` array with the scripted multi-topic conversation from the experimental
plan, then **increment the top-level `version`**: the store compares it against each
browser's saved copy and re-seeds when they differ, so every participant starts from
identical state.

Conversation state lives in `localStorage` under `hci-baseline` and `hci-nested`. To reset a browser by
hand between participants, clear site data for `localhost:11434`.

## Fidelity

The palette, type scale, spacing and radii in `baseline/style.css` are transcribed
from claude.ai's own critical CSS (its `cds-*` design tokens) at density
`comfortable`, rather than eyeballed: white page / `#fafafa` sidebar in light,
`#191919` / `#1f1f1f` in dark, blue accent `hsl(213 68% 45%)`, prose at 1rem.
Clay `#d97757` is the logo spark only. Assistant replies render in the serif face
and user messages in the sans one, as the app does (`data-reply-face="serif"`).

### Known gaps

- **Fonts.** claude.ai ships `anthropic-sans` and `anthropic-serif`, which are not
  redistributable. The stylesheet uses the same fallback stacks the app declares
  behind them (system sans, Georgia), so letterforms differ while sizes and
  spacing match.
- **Theme follows the OS.** There is no in-app toggle. For the study, decide light
  or dark once and set every machine the same way, or participants see different
  interfaces.
- **Markdown is a subset** - headings, bold, italic, inline and fenced code, lists,
  blockquotes, rules and links. No tables, nested lists or images. The seed
  conversation must stay inside that subset.
- **Decorative controls.** The nav rows (Projects, Artifacts, Scheduled, Design,
  Customize), the mode switch, Share, attach, dictate, Manual and the thumb
  ratings are inert, and Search does not open the command palette. They are there
  for visual fidelity; if a participant clicking a dead control would hurt the
  study, remove them from `baseline/index.html` rather than adding behaviour.
- **User-message actions** are the timestamp and copy only; real Claude also offers
  retry and edit from a user turn.
- Port `11434` is Ollama's own. If a real Ollama daemon is ever installed on the
  same machine, one of the two has to move (`PORT` in `serve.py`).
