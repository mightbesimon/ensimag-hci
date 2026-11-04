"""Connection to a real Ollama daemon, when one is running.

Everything here degrades to "not available" rather than raising, so the
interfaces keep working on a machine with no Ollama installed.
"""
import json
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

# Short, because every model list waits on it and a missing daemon should not
# stall the page.
PROBE_TIMEOUT = 0.5
PROBE_CACHE_SECONDS = 5

# Generous: a local model on CPU can take a long time to answer.
CHAT_TIMEOUT = 600

# Outlining is a short structured answer, but still slow on CPU.
COMPLETE_TIMEOUT = 180


class OllamaDaemon:
	"""Reports what a local daemon has pulled, and relays chat to it."""

	def __init__(self, url):
		self._url = url.rstrip('/')
		self._models = []
		self._checked_at = None

	@property
	def url(self):
		return self._url

	def models(self):
		"""Model names the daemon has pulled; empty when it is unreachable."""
		now = time.monotonic()
		if self._checked_at is not None and now - self._checked_at < PROBE_CACHE_SECONDS:
			return self._models
		self._checked_at = now
		self._models = self._probe()
		return self._models

	def available(self):
		return bool(self.models())

	def open_chat(self, model, messages):
		"""Opens a streaming chat response. Raises if the daemon refuses."""
		body = json.dumps({'model': model, 'messages': messages, 'stream': True}).encode('utf-8')
		request = Request(
			self._url + '/api/chat',
			data=body,
			headers={'Content-Type': 'application/json'},
			method='POST',
		)
		return urlopen(request, timeout=CHAT_TIMEOUT)

	def complete(self, model, messages, json_only=False):
		"""One non-streaming answer. Raises if the daemon refuses."""
		body = {'model': model, 'messages': messages, 'stream': False}
		if json_only:
			body['format'] = 'json'
		request = Request(
			self._url + '/api/chat',
			data=json.dumps(body).encode('utf-8'),
			headers={'Content-Type': 'application/json'},
			method='POST',
		)
		with urlopen(request, timeout=COMPLETE_TIMEOUT) as response:
			return json.load(response).get('message', {}).get('content', '')

	def _probe(self):
		try:
			with urlopen(self._url + '/api/tags', timeout=PROBE_TIMEOUT) as response:
				payload = json.load(response)
		except (HTTPError, URLError, OSError, ValueError):
			return []
		return [entry['name'] for entry in payload.get('models', []) if entry.get('name')]
