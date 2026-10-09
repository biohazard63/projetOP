export type CatalogueCard = {
  id: string; code: string; name: string; type: string; color: string;
  cost: number | null; power: number | null; counter: string | number | null;
  rarity: string; rarityName?: string | null; imageUrl: string;
  set: string | null; setCode?: string | null; effect: string | null;
  trigger: string | null; ability: string | null; attribute: string | null;
  family: string | null; notes?: string | null;
  isAltArt: boolean | null; isParallel: boolean | null; isSpecial: boolean | null;
  quantity?: number; acquiredAt?: string; isFavorite?: boolean;
}
export type SetProgress = { code: string; name: string; total: number; unique: number; copies: number; percentage: number; alternatives: number; ownedAlternatives: number }
export type CollectorOverview = {
  profile: { name: string | null; email: string; createdAt: string };
  total: number; unique: number; catalogue: number; percentage: number; decks: number; openings: number;
  alternatives: number; ownedAlternatives: number; sets: SetProgress[];
  recentCards: CatalogueCard[]; recentRareCards: CatalogueCard[];
  lastOpening: { id: string; openedAt: string; setName: string; setCode: string } | null;
}
export type HistoryRow = { id: string; setName: string; setCode: string; openedAt: string; creditedAt: string | null; cardCount: number }
export type HistoryPage = { openings: HistoryRow[]; nextCursor: string | null }
export type CollectorDeck = { id: string; name: string; cards: (CatalogueCard & { quantity: number })[] }
