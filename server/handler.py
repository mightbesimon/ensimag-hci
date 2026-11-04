"""HTTP routing: each interface as static files, plus the Ollama stub API."""
import json
import os
import time
from http.server import SimpleHTTPRequestHandler

from .ollama import OllamaStub
from .outline import OutlineBuilder

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
	outline = OutlineBuilder()

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
			'/api/tags': self.stub.tags,
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

	def _chat(self, request, messages):
		model = request.get('model') or self.stub.MODELS[0]
		text = self.stub.reply_text(messages)
		if request.get('stream', True):
			self._send_stream(model, text)
			return
		self._send_json(200, self.stub.final(model, text, streamed=False))

	def _outline(self, request, messages):
		self._send_json(200, self.outline.build(messages))

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
		line = (json.dumps(payload) + '\n').encode('utf-8')
		self.wfile.write(b'%x\r\n' % len(line) + line + b'\r\n')
		self.wfile.flush()
