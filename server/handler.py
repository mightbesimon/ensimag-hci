"""HTTP routing: each interface as static files, plus the Ollama stub API."""
import json
import os
import time
from http.server import SimpleHTTPRequestHandler
from urllib.error import HTTPError, URLError

from .daemon import OllamaDaemon
from .ollama import OllamaStub
from .outline import ModelOutline, OutlineBuilder
from .settings import LIVE_MODEL, OLLAMA_MODEL, OLLAMA_URL

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# One mount per study condition. Only these directories are reachable over HTTP;
# the rest of the repository (server code, .git) stays unexposed.
DEFAULT_ROOT = os.path.join(ROOT, 'nested')
MOUNTS = (
	('/baseline', os.path.join(ROOT, 'baseline')),
)

# Pause before the first token, then between tokens, so the interface behaves
# like a real backend rather than pasting a finished answer.
FIRST_TOKEN_DELAY = 0.45
TOKEN_DELAY = 0.018


class RequestHandler(SimpleHTTPRequestHandler):
	protocol_version = 'HTTP/1.1'

	stub = OllamaStub()
	daemon = OllamaDaemon(OLLAMA_URL)
	outline = ModelOutline(daemon, OutlineBuilder(), OLLAMA_MODEL)

	def __init__(self, *args, **kwargs):
		super().__init__(*args, directory=DEFAULT_ROOT, **kwargs)

	def translate_path(self, path):
		for prefix, root in MOUNTS:
			if path != prefix and not path.startswith(prefix + '/'):
				continue
			self.directory = root
			return super().translate_path(path[len(prefix):] or '/')
		self.directory = DEFAULT_ROOT
		return super().translate_path(path)

	def log_message(self, template, *args):
		if self.path.startswith('/api/'):
			super().log_message(template, *args)

	def do_GET(self):
		routes = {
			'/api/version': self.stub.version,
			'/api/tags': self._tags,
		}
		handler = routes.get(self.path)
		if not handler:
			super().do_GET()
			return
		self._send_json(200, handler())

	def do_POST(self):
		routes = {
			'/api/chat': self._chat,
			'/api/outline': self._outline,
		}
		handler = routes.get(self.path)
		if not handler:
			self.send_error(404)
			return

		request = self._read_json()
		if request is None:
			return

		messages = request.get('messages')
		if not isinstance(messages, list) or not messages:
			self._send_json(400, {'error': 'messages must be a non-empty list'})
			return
		handler(request, messages)

	def _tags(self):
		"""Ollama's own payload, plus whether each entry can actually be used.

		`available` and `detail` are extensions; an Ollama client ignores them.
		"""
		payload = self.stub.tags()
		live = self.daemon.available()
		for entry in payload['models']:
			if entry['name'] != LIVE_MODEL:
				entry['available'] = True
				entry['detail'] = ''
				continue
			entry['available'] = live
			entry['detail'] = 'Local Ollama' if live else 'Ollama is not running'
		return payload

	def _chat(self, request, messages):
		model = request.get('model') or self.stub.MODELS[0]
		if model == LIVE_MODEL:
			self._live_chat(request, messages)
			return

		text = self.stub.reply_text(messages)
		if request.get('stream', True):
			self._send_stream(model, text)
			return
		self._send_json(200, self.stub.final(model, text, streamed=False))

	def _live_chat(self, request, messages):
		"""Relays to a real daemon. Errors are reported before any body is sent,
		because a chunked response cannot be taken back."""
		names = self.daemon.models()
		if not names:
			self._send_json(503, {'error': 'Ollama is not running at ' + self.daemon.url})
			return

		target = OLLAMA_MODEL or names[0]
		try:
			response = self.daemon.open_chat(target, messages)
		except HTTPError as error:
			detail = error.read().decode('utf-8', errors='replace')[:400]
			self._send_json(502, {'error': 'Ollama returned {}: {}'.format(error.code, detail)})
			return
		except (URLError, OSError) as error:
			self._send_json(502, {'error': 'Could not reach Ollama: {}'.format(error)})
			return

		with response:
			if request.get('stream', True):
				self._relay_stream(response)
				return
			self._send_json(200, self._collect(response))

	def _relay_stream(self, response):
		"""Ollama already speaks the NDJSON the interface expects, so the lines
		go straight through."""
		self.send_response(200)
		self.send_header('Content-Type', 'application/x-ndjson')
		self.send_header('Transfer-Encoding', 'chunked')
		self.send_header('Cache-Control', 'no-store')
		self.end_headers()

		for line in response:
			if line.strip():
				self._write_bytes(line if line.endswith(b'\n') else line + b'\n')
		self.wfile.write(b'0\r\n\r\n')
		self.wfile.flush()

	def _collect(self, response):
		content = []
		final = {}
		for line in response:
			if not line.strip():
				continue
			payload = json.loads(line)
			content.append(payload.get('message', {}).get('content', ''))
			if payload.get('done'):
				final = payload
		final['message'] = {'role': 'assistant', 'content': ''.join(content)}
		return final

	def _outline(self, request, messages):
		"""The live model groups the conversation itself when it is selected;
		otherwise the stub does, so the sidebar fills either way."""
		live = request.get('model') == LIVE_MODEL and self.daemon.available()
		self._send_json(200, self.outline.build(messages, live=live))

	def _read_json(self):
		length = int(self.headers.get('Content-Length') or 0)
		try:
			return json.loads(self.rfile.read(length))
		except ValueError:
			self._send_json(400, {'error': 'request body is not valid JSON'})
			return None

	def _send_json(self, code, payload):
		body = json.dumps(payload).encode('utf-8')
		self.send_response(code)
		self.send_header('Content-Type', 'application/json; charset=utf-8')
		self.send_header('Content-Length', str(len(body)))
		self.send_header('Cache-Control', 'no-store')
		self.end_headers()
		self.wfile.write(body)

	def _send_stream(self, model, text):
		self.send_response(200)
		self.send_header('Content-Type', 'application/x-ndjson')
		self.send_header('Transfer-Encoding', 'chunked')
		self.send_header('Cache-Control', 'no-store')
		self.end_headers()

		time.sleep(FIRST_TOKEN_DELAY)
		for chunk in self.stub.chunks(text):
			self._write_chunk(self.stub.fragment(model, chunk))
			time.sleep(TOKEN_DELAY)
		self._write_chunk(self.stub.final(model, text, streamed=True))
		self.wfile.write(b'0\r\n\r\n')
		self.wfile.flush()

	def _write_chunk(self, payload):
		self._write_bytes((json.dumps(payload) + '\n').encode('utf-8'))

	def _write_bytes(self, line):
		self.wfile.write(b'%x\r\n' % len(line) + line + b'\r\n')
		self.wfile.flush()
