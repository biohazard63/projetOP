import React from 'react'

// Card rules text styled like the printed One Piece Card Game cards: timing keywords in blue boxes, [Counter] in red,
// [Trigger] in yellow, keyword abilities in orange, [Once Per Turn] in pink, DON!! conditions in black. Only this closed
// list of official keywords (English and French prints) is styled: card names written in brackets ([Uta]) stay plain text.
export type KeywordTone = 'timing' | 'counter' | 'trigger' | 'ability' | 'once' | 'don'
const KEYWORDS: Record<string, KeywordTone> = {}
const add = (tone: KeywordTone, words: string[]) => { for (const w of words) KEYWORDS[normalize(w)] = tone }
function normalize(word: string) { return word.replace(/ /g, ' ').replace(/\s*:\s*/g, ': ').replace(/\s+/g, ' ').trim().toLowerCase() }
add('timing', ['On Play', 'When Attacking', 'Activate: Main', 'Main', 'On K.O.', 'Your Turn', "Opponent's Turn", "On Opponent's Attack", 'End of Your Turn', "End of Your Opponent's Turn", 'On Block',
  'Jouée', 'En attaquant', 'Activation : Principale', 'Principale', 'En cas de KO', 'En cas de K.O.', 'Votre tour', 'Tour adverse', 'Attaque adverse', 'Fin de votre tour', 'Fin du tour adverse', 'En bloquant'])
add('counter', ['Counter', 'Contre'])
add('trigger', ['Trigger', 'Déclenchement'])
add('ability', ['Blocker', 'Rush', 'Rush: Character', 'Double Attack', 'Banish', 'Unblockable',
  'Bloqueur', 'Initiative', 'Initiative : Personnage', 'Double attaque', 'Exil', 'Imblocable'])
add('once', ['Once Per Turn', 'Une fois par tour'])

/** Tone of a bracketed keyword, or null when the brackets hold something else (a card name, a type). */
export function keywordTone(inner: string): KeywordTone | null {
  if (/^DON!!\s*x\s*\d+$/i.test(inner.replace(/ /g, ' '))) return 'don'
  return KEYWORDS[normalize(inner)] ?? null
}

const TOKEN = /\[([^\]\n]{1,40})\]|DON!!(?:\s| )*[−-](?:\s| )*\d+/g
export function CardText({ text, className }: { text: string; className?: string }) {
  const lines = text.split(/\n+/).filter(Boolean)
  return <div className={`op-text${className ? ` ${className}` : ''}`}>{lines.map((line, i) => <p key={i}>{segments(line)}</p>)}</div>
}
function segments(line: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let last = 0
  for (const m of line.matchAll(TOKEN)) {
    const tone = m[1] === undefined ? 'don' : keywordTone(m[1])
    if (!tone) continue
    if (m.index! > last) out.push(line.slice(last, m.index))
    out.push(<span key={m.index} className={`op-kw ${tone}`}>{m[1] ?? m[0].replace(/ /g, ' ')}</span>)
    last = m.index! + m[0].length
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}
