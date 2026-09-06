"""Extract user-visible text from the saved public ChatGPT share, without browser cookies."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'docs/sources/shared_conversation.html'
html = source.read_text(encoding='utf-8-sig')
chunks = [json.loads(m.group(1)) for m in re.finditer(r'streamController\.enqueue\(("(?:\\.|[^"\\])*")\)', html)]
if not chunks:
    raise SystemExit('No shared conversation data found; do not treat the page shell as the conversation.')
flat = json.loads(chunks[0].splitlines()[0])
memo = {}
UNDEF = object()
def hydrate(index):
    if index < 0:
        return UNDEF
    if index in memo:
        return memo[index]
    value = flat[index]
    if isinstance(value, dict):
        out = {}
        memo[index] = out
        for key, ref in value.items():
            match = re.fullmatch(r'_(\d+)', key)
            decoded_key = str(hydrate(int(match.group(1)))) if match else key
            decoded_value = hydrate(ref) if isinstance(ref, int) else ref
            if decoded_value is not UNDEF:
                out[decoded_key] = decoded_value
        return out
    if isinstance(value, list):
        out = []
        memo[index] = out
        for ref in value:
            item = hydrate(ref) if isinstance(ref, int) else ref
            if item is not UNDEF:
                out.append(item)
        return out
    memo[index] = value
    return value
root = hydrate(0)
seen = set()
def find_conversation(obj):
    if id(obj) in seen:
        return None
    seen.add(id(obj))
    if isinstance(obj, dict):
        if isinstance(obj.get('mapping'), dict):
            return obj
        for child in obj.values():
            found = find_conversation(child)
            if found is not None:
                return found
    elif isinstance(obj, list):
        for child in obj:
            found = find_conversation(child)
            if found is not None:
                return found
    return None
convo = find_conversation(root)
if convo is None:
    raise SystemExit(f'No conversation mapping. Root keys={list(root) if isinstance(root, dict) else type(root)}')
mapping = convo['mapping']
current = convo.get('current_node')
path = []
visited = set()
while current in mapping and current not in visited:
    visited.add(current)
    node = mapping[current]
    path.append(node)
    current = node.get('parent')
if path:
    path.reverse()
    extraction_mode = 'active_branch'
else:
    path = sorted(mapping.values(), key=lambda n: (n.get('message') or {}).get('create_time') or 0)
    extraction_mode = 'all_nodes_chronological_fallback'
messages = []
for node in path:
    msg = node.get('message') or {}
    role = (msg.get('author') or {}).get('role')
    if role not in ('user', 'assistant') or msg.get('channel') in ('analysis', 'justify', 'confidence'):
        continue
    content = msg.get('content') or {}
    parts = content.get('parts') or [content.get('text', '')]
    text = '\n'.join(x for x in parts if isinstance(x, str)).strip()
    if text:
        messages.append({'role': role, 'text': text, 'node_id': node.get('id'), 'create_time': msg.get('create_time')})
metadata = {'url': 'https://chatgpt.com/share/6a9de06f-e514-83eb-b41c-2d9e3e5d4544?ogimg=plain', 'title': convo.get('title'), 'extraction_mode': extraction_mode, 'mapping_nodes': len(mapping), 'visible_messages': len(messages)}
out = '# Shared product conversation\n\n' + json.dumps(metadata, ensure_ascii=False, indent=2) + '\n\n'
out += '\n\n'.join(f'## {i}. {m["role"].upper()}\n\n{m["text"]}' for i, m in enumerate(messages, 1))
(ROOT / 'docs/sources/shared_conversation.md').write_text(out, encoding='utf-8')
(ROOT / 'docs/sources/shared_conversation.json').write_text(json.dumps({'metadata': metadata, 'messages': messages}, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(metadata, ensure_ascii=False))
print(f'Extracted characters: {len(out)}')
for i, msg in enumerate(messages, 1):
    if msg['role'] == 'user':
        print(f'USER {i}: {msg["text"]}')
