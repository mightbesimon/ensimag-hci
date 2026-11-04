"""Plausible-looking filler prose for the stub Ollama backend."""
import hashlib
import random
import re


class GibberishWriter:
	"""Writes markdown that reads like an assistant reply but says nothing.

	Replies are deterministic in the prompt: the same question always yields
	the same answer, so a scripted study session is reproducible between
	participants.
	"""

	OPENINGS = [
		'Good question — {topic} is one of those things that looks simple until you look closely.',
		'Short answer: {topic} depends almost entirely on where you draw the boundary.',
		'There are a few angles to {topic}, and they pull in different directions.',
		'The useful framing for {topic} is to separate what is fixed from what you actually control.',
		'Most of the confusion around {topic} comes from conflating two separate concerns.',
	]

	SUBJECTS = [
		'the retrieval layer', 'this pattern', 'the surrounding context',
		'a shared boundary', 'the upstream signal', 'the ordering guarantee',
		'each intermediate step', 'the cheaper path', 'whatever the caller holds',
		'the outer loop', 'a single source of truth', 'the fallback branch',
	]

	VERBS = [
		'tends to shape', 'quietly constrains', 'maps cleanly onto',
		'collapses into', 'borrows its structure from', 'has to agree with',
		'ends up carrying', 'does most of the work for', 'reads naturally as',
	]

	OBJECTS = [
		'the way the pieces fit together', 'whatever the caller already knows',
		'the shape of the final result', 'a much narrower set of cases',
		'the part a reader actually notices', 'the cost you pay later',
		'the invariant everything else leans on', 'the step people skip first',
	]

	QUALIFIERS = [
		'in most realistic setups', 'once the obvious cases are handled',
		'provided nothing reorders underneath you', 'at least for small inputs',
		'which is usually what you want', 'and that is the whole trick',
		'though it rarely matters in practice', 'assuming the boundary holds',
	]

	HEADINGS = [
		'How this usually plays out', 'A few things worth noting',
		'Where it gets interesting', 'The practical version',
		'Trade-offs', 'What to watch for',
	]

	BULLET_LEADS = [
		'Scope', 'Ordering', 'Cost', 'Failure modes', 'Readability',
		'State', 'Boundaries', 'Reversibility',
	]

	SNIPPETS = [
		('python', 'def resolve(items, boundary):\n    if not items:\n        return boundary\n    head, rest = items[0], items[1:]\n    return resolve(rest, boundary.extend(head))'),
		('javascript', 'const collapse = (nodes, seen = new Set()) =>\n  nodes\n    .filter((node) => !seen.has(node.id))\n    .map((node) => ({ ...node, depth: seen.add(node.id).size }));'),
		('bash', 'for layer in ./layers/*; do\n  printf "%s -> %s\\n" "$layer" "$(wc -l < "$layer")"\ndone'),
	]

	CLOSINGS = [
		'Want me to go deeper on any of these?',
		'Happy to work through a concrete example if that is more useful.',
		'Let me know which part you want to pull on and I can expand it.',
		'If you tell me the constraint you actually care about, I can narrow this down.',
	]

	STOPWORDS = {
		'what', 'how', 'why', 'when', 'where', 'who', 'is', 'are', 'was', 'the',
		'a', 'an', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'of',
		'in', 'on', 'for', 'to', 'and', 'or', 'me', 'my', 'i', 'you', 'it',
		'about', 'tell', 'explain', 'between', 'difference',
	}

	def reply(self, prompt):
		rng = random.Random(self._seed(prompt))
		parts = [
			rng.choice(self.OPENINGS).format(topic=self._topic(prompt, rng)),
			'',
			self._paragraph(rng, 3),
			'',
			'## ' + rng.choice(self.HEADINGS),
			'',
			self._bullets(rng),
		]
		if rng.random() < 0.55:
			language, body = rng.choice(self.SNIPPETS)
			parts += ['', '```' + language, body, '```']
		parts += ['', self._paragraph(rng, 2), '', rng.choice(self.CLOSINGS)]
		return '\n'.join(parts)

	def chunks(self, text):
		"""Split into word-sized pieces, the way a real backend emits tokens.

		Whitespace rides along with the word that follows it, so joining the
		chunks reproduces the original text exactly.
		"""
		return re.findall(r'\s*\S+|\s+$', text)

	def _seed(self, prompt):
		digest = hashlib.sha256(prompt.encode('utf-8')).digest()
		return int.from_bytes(digest[:8], 'big')

	def _topic(self, prompt, rng):
		words = [word.strip('.,?!:;"\'()[]').lower() for word in prompt.split()]
		candidates = [word for word in words if len(word) > 3 and word not in self.STOPWORDS]
		if not candidates:
			return 'this'
		return ' '.join(candidates[:3]) if rng.random() < 0.5 else candidates[0]

	def _sentence(self, rng):
		return '{} {} {}, {}.'.format(
			rng.choice(self.SUBJECTS).capitalize(),
			rng.choice(self.VERBS),
			rng.choice(self.OBJECTS),
			rng.choice(self.QUALIFIERS),
		)

	def _paragraph(self, rng, sentences):
		return ' '.join(self._sentence(rng) for _ in range(sentences))

	def _bullets(self, rng):
		leads = rng.sample(self.BULLET_LEADS, rng.randint(3, 4))
		return '\n'.join('- **{}** — {}'.format(lead, self._sentence(rng)) for lead in leads)
