"""Run the baseline interface and its stub Ollama backend.

	python3 serve.py
"""
from http.server import ThreadingHTTPServer

from server.handler import RequestHandler
from server.settings import HOST, PORT


class Application:
	def __init__(self, host=HOST, port=PORT):
		self._server = ThreadingHTTPServer((host, port), RequestHandler)
		self._url = 'http://{}:{}'.format(host, port)

	def run(self):
		print('Baseline interface : {}'.format(self._url))
		print('Stub Ollama API    : {}/api/tags, {}/api/chat'.format(self._url, self._url))
		print('Ctrl+C to stop.\n')
		try:
			self._server.serve_forever()
		except KeyboardInterrupt:
			print('\nStopped.')


if __name__ == '__main__':
	Application().run()
