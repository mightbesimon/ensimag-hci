"""Everything a person might reasonably need to change, in one place."""

# Where this server listens. Deliberately not 11434: that is Ollama's own port,
# and the two have to be able to run side by side.
HOST = '127.0.0.1'
PORT = 8080

# Where a real Ollama daemon listens, when one is running.
OLLAMA_URL = 'http://127.0.0.1:11434'

# The entry in the model picker that a real daemon answers. Everything else is
# answered by the stub, so the interfaces work with or without Ollama installed.
LIVE_MODEL = 'claude-opus-5:latest'

# Which model Ollama should actually run for that entry. Blank means "whichever
# model the daemon lists first", so any pulled model works without editing this.
OLLAMA_MODEL = ''
