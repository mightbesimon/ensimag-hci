"""Stub implementation of the Ollama chat API surface."""
import hashlib
from datetime import datetime, timezone

from .gibberish import GibberishWriter


class OllamaStub:
	"""Produces the same payload shapes as a real Ollama daemon.

	Only the chat surface is covered: /api/version, /api/tags and /api/chat.
	"""

	VERSION = '0.12.3'

	# Named after the models the baseline UI is imitating, so the picker in the
	# interface and the backend catalogue stay a single source of truth.
	MODELS = (
		'claude-sonnet-4.5:latest',
		'claude-opus-4.1:latest',
		'claude-haiku-4.5:latest',
	)

	def __init__(self):
		self._writer = GibberishWriter()

	def version(self):
		return {'version': self.VERSION}

	def tags(self):
		return {'models': [self._tag(name) for name in self.MODELS]}

	def reply_text(self, messages):
		prompts = [message['content'] for message in messages if message['role'] == 'user']
		return self._writer.reply(prompts[-1] if prompts else '')

	def chunks(self, text):
		return self._writer.chunks(text)

	def fragment(self, model, content):
		return {
			'model': model,
			'created_at': self._now(),
			'message': {'role': 'assistant', 'content': content},
			'done': False,
		}

	def final(self, model, text, streamed):
		return {
			'model': model,
			'created_at': self._now(),
			'message': {'role': 'assistant', 'content': '' if streamed else text},
			'done_reason': 'stop',
			'done': True,
			'total_duration': 1_000_000 * len(text),
			'load_duration': 12_000_000,
			'prompt_eval_count': 24,
			'prompt_eval_duration': 3_000_000,
			'eval_count': len(self.chunks(text)),
			'eval_duration': 900_000 * len(text),
		}

	def _tag(self, name):
		digest = hashlib.sha256(name.encode('utf-8')).hexdigest()
		return {
			'name': name,
			'model': name,
			'modified_at': self._now(),
			'size': 2_000_000_000 + int(digest[:6], 16),
			'digest': digest,
			'details': {
				'parent_model': '',
				'format': 'gguf',
				'family': 'llama',
				'families': ['llama'],
				'parameter_size': '8.0B',
				'quantization_level': 'Q4_K_M',
			},
		}

	def _now(self):
		return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f000Z')
