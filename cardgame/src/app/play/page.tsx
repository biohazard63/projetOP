import PlayApp from '@/components/play/PlayApp'
import { REFERENCE_DECKS } from '@/lib/engine/decks'
import LEADER_ARTWORK from '../../../public/images/play/leaders/manifest.json'
import { frenchImage, officialImage } from '@/lib/engine/catalog'

export default function PlayPage() {
  // Public presentation metadata, derived from the existing references and artwork resolver.
  // No card definition, game rule or API contract is changed.
  const cached: Record<string, { path: string }> = LEADER_ARTWORK.assets
  const leaderImages = Object.fromEntries(REFERENCE_DECKS.filter(deck => deck.id.startsWith('starter-')).map(deck => [deck.leader, cached[deck.leader]?.path ?? frenchImage(deck.leader) ?? officialImage(deck.leader)]))
  return <PlayApp leaderImages={leaderImages} />
}
