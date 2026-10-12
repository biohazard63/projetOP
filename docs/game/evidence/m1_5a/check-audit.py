"""Vérification de preuves d'audit, pas test du futur moteur d'effets."""
import hashlib,json,pathlib,re
root=pathlib.Path(__file__).resolve().parents[4]; evidence=root/'docs/game/evidence/m1_5a'
i=json.loads((evidence/'inventory.json').read_text()); matrix=json.loads((evidence/'mechanics.json').read_text())
assert not i['inputs']['errors']
assert not i['coverage']['numbersOutsideMaster'] and not i['coverage']['keysOutsideMaster']
assert len({x['id'] for x in matrix})==len(matrix)
for x in matrix:
 assert x['canonicalCount']==len(x['numbers'])==len(set(x['numbers']))
 assert x['variantCount']==len(x['variants'])==len(set(x['variants']))
 assert x['canonicalCount']<=x['variantCount']<=i['totals']['variants']
 assert x['status']=='HEURISTIC_NOT_CERTIFIED'
changed=[]
for item in json.loads((evidence/'protected-hashes.json').read_text()):
 p=root/'cardgame'/item['path']
 if p.name=='.DS_Store': continue # Métadonnée Finder, hors données métier
 h=hashlib.sha256(p.read_bytes()).hexdigest()
 if h!=item['hash']:changed.append(item['path'])
assert not changed,changed
names=['EFFECT_ENGINE_ARCHITECTURE','EFFECT_MECHANICS_MATRIX','EFFECT_RESOLUTION_SPEC','EFFECT_DSL_SPEC','EFFECT_EDGE_CASES','FUTURE_SET_COMPATIBILITY','CARD_COMPILATION_PIPELINE','PLAYABILITY_CERTIFICATION','EFFECT_IMPLEMENTATION_PLAN','M1_5A_REPORT']
for name in names:
 text=(root/'docs/game'/f'{name}.md').read_text();assert text.strip();assert not any(line.endswith(' ') for line in text.splitlines())
print('PASS: inventaire JSON, identités, compteurs mécaniques, dix documents, empreintes métier inchangées')
