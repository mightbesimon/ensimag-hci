"""Semantic outline of a conversation.

A topic is a *phase* of the conversation spanning many exchanges, and its key
points are the moments within that phase. Both anchor to a message, so the
outline stays coarse: a long conversation yields a handful of topics, not one
per prompt.

In production this endpoint would ask the model to do the grouping. The stub
fakes it two ways:

- the seeded study conversations have their outline written out below, so the
  scripted material is stable and sensibly labelled;
- anything typed live is grouped by chance, in two stages: a message has a
  50/50 shot at opening a key point, and a key point is then promoted to a full
  topic three times in ten. Points therefore outnumber topics about two to one,
  which is the shape a real conversation takes. Both rolls are seeded from the
  message text, so the same conversation always produces the same outline. A
  study needs that: an outline that reshuffled between participants would not be
  the same stimulus twice.
"""
import copy
import hashlib
import random
import re

# Question openers stripped when inventing a label for an unrecognised message.
OPENER = re.compile(
	r'^(what|how|why|when|where|who|which|can|could|should|would|do|does|did|is|are|was|were'
	r'|tell me about|explain|describe)\b[\s,]*',
	re.IGNORECASE,
)

TITLE_WORDS = 6

# Dropped from the end of an invented label, so it does not trail off mid-phrase.
DANGLING = frozenset(
	'a an the of from in on for to with and or that this my your its as at by'.split()
)

# Every message gets a shot at opening a key point; a point that opens is then
# sometimes promoted to a whole topic. Chaining them this way keeps points more
# common than topics, so a conversation gets a few phases with moments inside.
NEW_POINT_CHANCE = 0.5
TOPIC_FROM_POINT_CHANCE = 0.3


class OutlineBuilder:
	"""Groups a message list into topics, each holding its key points."""

	# Written outlines for the seeded conversations, keyed by the message that
	# opens each one. `covers` is how many messages the written part accounts
	# for; anything the participant adds after that is grouped by chance.
	SCRIPTED = {
		'what are the main horse breed types, and what was each one bred to do?': {
			'covers': 24,
			'topics': [
				{'title': 'Breed types and bloodlines', 'start': 0, 'points': [
					{'title': 'Draught, light and pony types', 'start': 0},
					{'title': 'Hot, warm and cold blood', 'start': 4},
				]},
				{'title': 'Height and conformation', 'start': 8, 'points': [
					{'title': 'Measuring height in hands', 'start': 8},
					{'title': 'Conformation and soundness', 'start': 12},
				]},
				{'title': 'Choosing and keeping a horse', 'start': 16, 'points': [
					{'title': 'Temperament and rider experience', 'start': 16},
					{'title': 'What it costs to keep', 'start': 20},
				]},
			],
		},
		'i am thinking about getting a dog. how are breeds grouped, and does the group '
		'actually tell you anything useful?': {
			'covers': 24,
			'topics': [
				{'title': 'Choosing a breed', 'start': 0, 'points': [
					{'title': 'Breed groups and what they predict', 'start': 0},
					{'title': 'Fitting a dog to your home', 'start': 4},
				]},
				{'title': 'Health and breeding', 'start': 8, 'points': [
					{'title': 'Why pedigree problems happen', 'start': 8},
					{'title': 'Crossbreeds and finding a breeder', 'start': 12},
				]},
				{'title': 'Living with a dog', 'start': 16, 'points': [
					{'title': 'Training and socialisation', 'start': 16},
					{'title': 'Coat care and shedding', 'start': 20},
				]},
			],
		},
		'this conversation is a placeholder. replace the contents of baseline/seed/conversation.json '
		'with the scripted multi-topic conversation from the experimental plan, and bump "version" '
		'so every browser re-seeds.': {
			'covers': 4,
			'topics': [{'title': 'Seed file', 'start': 0, 'points': [
				{'title': 'What to put in it', 'start': 0},
				{'title': 'Re-seeding after an edit', 'start': 2},
			]}],
		},
		'a second conversation so the recents list is not empty.': {
			'covers': 2,
			'topics': [{'title': 'Second chat', 'start': 0, 'points': []}],
		},
		'and a third.': {
			'covers': 2,
			'topics': [{'title': 'Third chat', 'start': 0, 'points': []}],
		},
	}

	def build(self, messages):
		scripted = self._scripted(messages)
		topics = copy.deepcopy(scripted['topics']) if scripted else []

		for index in range(scripted['covers'] if scripted else 0, len(messages)):
			message = messages[index]
			if message.get('role') != 'user':
				continue

			content = message.get('content', '')
			if not topics:
				topics.append({'title': self._title(content), 'start': index, 'points': []})
				continue

			if not self._rolls(content, 'point', NEW_POINT_CHANCE):
				continue
			if self._rolls(content, 'topic', TOPIC_FROM_POINT_CHANCE):
				topics.append({'title': self._title(content), 'start': index, 'points': []})
				continue
			topics[-1]['points'].append({'title': self._title(content), 'start': index})

		return {'topics': topics}

	def _scripted(self, messages):
		opening = next((m.get('content', '') for m in messages if m.get('role') == 'user'), None)
		if opening is None:
			return None
		return self.SCRIPTED.get(self._key(opening))

	def _rolls(self, content, kind, chance):
		digest = hashlib.sha256('{}:{}'.format(kind, content).encode('utf-8')).digest()
		return random.Random(int.from_bytes(digest[:8], 'big')).random() < chance

	def _title(self, content):
		stripped = ' '.join(content.split())
		for _ in range(3):
			shorter = OPENER.sub('', stripped, count=1)
			if shorter == stripped:
				break
			stripped = shorter

		words = stripped.split()[:TITLE_WORDS]
		while words and words[-1].strip('.,?!:;\'"').lower() in DANGLING:
			words.pop()

		title = ' '.join(words).strip('.,?!:;\'"')
		if not title:
			return 'Untitled'
		return title[0].upper() + title[1:]

	def _key(self, content):
		return ' '.join(content.split()).lower()
