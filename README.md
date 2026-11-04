# ensimag-hci — baseline interface

Condition **A** of the user study: a reproduction of the claude.ai chat interface,
backed by a stub Ollama server that streams filler text. This is the control the
nested-navigation prototype is measured against, so it deliberately offers no way to
search or outline *within* a conversation — finding an earlier idea means scrolling.

## Run it

```bash
python3 serve.py
```

Then open <http://127.0.0.1:11434>. Nothing to install: Python 3 standard library and
plain HTML, CSS and ES modules, no build step and no package manager.

## Layout

| Path | What it is |
| --- | --- |
| `serve.py` | Entry point. Serves `baseline/` and the stub API on one port. |
| `server/handler.py` | HTTP routing, static files, chunked NDJSON streaming. |
| `server/ollama.py` | Ollama payload shapes: `/api/version`, `/api/tags`, `/api/chat`. |
| `server/gibberish.py` | The filler-prose generator. |
| `baseline/index.html` | Interface markup. |
| `baseline/style.css` | Palette and layout, light and dark. |
| `baseline/js/` | One class per file: store, markdown, composer, sidebar, chat view. |
| `baseline/seed/conversation.json` | The conversation participants start from. |

`prototype/` is a separate, unrelated piece of work and is untouched by any of this.

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

`baseline/seed/conversation.json` currently holds **placeholder content**. Replace the
`conversations` array with the scripted multi-topic conversation from the experimental
plan, then **increment the top-level `version`**: the store compares it against each
browser's saved copy and re-seeds when they differ, so every participant starts from
identical state.

Conversation state lives in `localStorage` under `hci-baseline`. To reset a browser by
hand between participants, clear site data for `localhost:11434`.

## Known gaps

- **Fonts.** claude.ai ships Styrene and Copernicus, which are not redistributable. The
  stylesheet falls back to system sans and system serif, so letterforms differ even
  though weight, size and spacing match.
- **Theme follows the OS.** There is no in-app toggle. For the study, decide light or
  dark once and set every machine the same way, or participants see different interfaces.
- **Markdown is a subset** — headings, bold, italic, inline and fenced code, lists,
  blockquotes, rules and links. No tables, nested lists or images. The seed conversation
  must stay inside that subset.
- **Decorative controls.** The `+` and Tools buttons, and the thumb ratings, are inert.
  The model picker is live but every model returns the same generator.
- Port `11434` is Ollama's own. If a real Ollama daemon is ever installed on the same
  machine, one of the two has to move (`PORT` in `serve.py`).
