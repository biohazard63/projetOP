import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import fs from 'node:fs'
import path from 'node:path'
import { Board } from '../src/components/play/Board'
import { prompt, type Intent } from '../src/components/play/model'
import { MemoryGameRepository } from '../src/lib/engine/repository'
import { REFERENCE_DECKS } from '../src/lib/engine/decks'
import { PlayService } from '../src/lib/engine/service'
import type { View } from '../src/components/play/api'

const root = process.cwd()
const evidence = path.resolve(root, process.env.PLAY_LAYOUT_EVIDENCE_DIR ?? '../docs/game/evidence/play-layout/size-correction')
fs.mkdirSync(evidence, { recursive: true })

async function main() {
  ;(globalThis as typeof globalThis & { React: typeof React }).React = React
  const repository = new MemoryGameRepository()
  const service = new PlayService(repository, () => 4242)
  const deck = REFERENCE_DECKS.find(candidate => candidate.id === 'reference-purple')
  if (!deck) throw new Error('REFERENCE_DECK_MISSING')
  const userId = 'play-layout-capture'
  let view = await service.start(userId, { ref: deck.id, entries: deck.entries }) as unknown as View

  for (let index = 0; index < 8 && prompt(view).kind !== 'main'; index += 1) {
    const decision = prompt(view)
    let intent: Intent
    if (decision.kind === 'first') intent = { type: 'CHOOSE_FIRST', choice: 'FIRST' }
    else if (decision.kind === 'mulligan') intent = { type: 'MULLIGAN', redraw: false }
    else if (decision.kind === 'advance') intent = { type: 'ADVANCE_PHASE' }
    else throw new Error(`UNEXPECTED_CAPTURE_DECISION:${decision.kind}`)
    view = (await service.command(userId, view.gameId, { id: `capture-${index}`, expectedVersion: view.version, intent })).view as unknown as View
  }
  if (prompt(view).kind !== 'main') throw new Error(`CAPTURE_SETUP_DID_NOT_REACH_MAIN:${prompt(view).kind}`)
  const renderView: View = { ...view, cards:Object.fromEntries(Object.entries(view.cards).map(([key, card]) => [key, { ...card, imageUrl:'/images/OP09-093.webp' }])) }

  fs.writeFileSync(path.join(evidence, 'capture-view.json'), JSON.stringify(renderView))

  const markup = renderToStaticMarkup(createElement(Board, {
    view:renderView,
    send: () => undefined,
    busy: false,
    step: null,
    log: [],
    motion: 'reduced',
    reduced: true,
    onMotion: () => undefined,
    onConcede: () => undefined,
    onLeave: () => undefined,
    onNewGame: () => undefined,
    onSkipAnim: () => undefined,
    tutorial: { active: false, step: 0 },
    onTutorial: () => undefined,
    stats: null,
  }))
  const localCard = fs.readFileSync(path.join(root, 'public/images/OP09-093.webp')).toString('base64')
  const staticMarkup = markup.replace(/\s+srcSet="[^"]*"/g, '')
    .replace(/src="\/_next\/image\?[^\"]*"/g, `src="data:image/webp;base64,${localCard}"`)
  const css = fs.readFileSync(path.join(root, 'src/app/play/play.css'), 'utf8')
  const mat = fs.readFileSync(path.join(root, 'public/images/play/board-mat.png')).toString('base64')
  const document = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#061120}*{box-sizing:border-box}.play-layer{position:fixed;inset:0;background:#061120}</style><style>${css}</style><style>body .tbl-field::before{background-image:linear-gradient(180deg,#07132135,#07132152),url(data:image/png;base64,${mat})}</style></head><body><div class="play-layer">${staticMarkup}</div></body></html>`
  fs.writeFileSync(path.join(evidence, 'actual-board.html'), document)
  fs.writeFileSync(path.join(evidence, 'actual-board-source.json'), JSON.stringify({
    source: 'Board rendered from PlayerView created by PlayService and MemoryGameRepository',
    deck: deck.id,
    prompt: prompt(view).kind,
    viewVersion: view.version,
    note: 'Static render for visual layout only; interactions are not executed. Remote optimized card image URLs are replaced with a local image to keep this capture offline.',
  }, null, 2) + '\n')
}

main().catch(error => { console.error(error); process.exitCode = 1 })
