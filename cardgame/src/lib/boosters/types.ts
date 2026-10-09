import type { Card } from '@prisma/client'
import type { BoosterRules } from './rules'
export type OpeningCard = Card & { position: number; quantityBefore: number | null; isDuplicate: boolean | null; isNew: boolean | null }
export type OpeningResult = {
  id: string; boosterId: string; setCode: string; setName: string; openedAt: string;
  creditedAt: string | null; cards: OpeningCard[]; specialPack: string | null;
  rules: { label: string; source: string; slotCount: number } | null;
  newCardsCount: number | null; hasRareCard: boolean; legacy: boolean;
}
export type BoosterCatalogItem = { code: string; name: string; imageUrl: string | null; description: string | null; cardCount: number; packSize: number | null; available: boolean; error: string | null; rules: Pick<BoosterRules, 'label' | 'source' | 'slots' | 'specialPacks'> | null; warnings: string[]; mode: 'free-simulation' }
