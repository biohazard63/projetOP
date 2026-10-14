import 'dotenv/config'
import { PrismaClient, Card } from '@prisma/client'

const prisma = new PrismaClient()

type DeckSpec = {
  deckName: string
  deckCode: string // ex: ST-01
  cards: Array<{ name: string; quantity: number }>
}

// Utilitaires
const toSafe = (s: string) => s
  .toLowerCase()
  .normalize('NFD').replace(/\p{Diacritic}/gu, '')
  // Remplacer toute ponctuation par un espace pour un matching plus robuste
  .replace(/\p{P}+/gu, ' ')
  .replace(/\s+/g, ' ').trim()

const stripParen = (s: string) => s.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()

const extractParen = (s: string) => {
  const m = s.match(/\(([^)]*)\)/)
  return m ? m[1] : ''
}

const nameVariants = (raw: string): string[] => {
  const variants = new Set<string>()
  variants.add(raw)
  variants.add(stripParen(raw))
  const inner = extractParen(raw)
  if (inner) variants.add(inner)
  // Normalisations ciblées FR/EN fréquentes
  for (const v of Array.from(variants)) {
    let w = v
    w = w.replace(/quichotte/gi, 'quixote') // Donquichotte -> Donquixote
    w = w.replace(/doflamingo/gi, 'doflamingo')
    w = w.replace(/mont d[’'`]or/gi, "mont d'or")
    variants.add(w)
  }
  return Array.from(variants)
}

const codePrefixFromDeck = (deckCode: string) => deckCode.replace(/-/g, '') // ST-01 -> ST01

async function findCardByNameAndSet(baseName: string, deckCode: string, wantLeader = false): Promise<Card | null> {
  const normBase = toSafe(stripParen(baseName))
  const prefix = codePrefixFromDeck(deckCode)

  // 1) Chercher dans le set en priorité (code, setCode ou set)
  const inSet = await prisma.card.findMany({
    where: {
      OR: [
        { code: { startsWith: `${prefix}-` } },
        { setCode: { equals: prefix } },
        { set: { contains: deckCode } },
      ]
    }
  })

  const pickFrom = (list: Card[], term: string): Card | null => {
    let best: Card | null = null
    const tokens = toSafe(term).split(' ').filter(t => t.length > 1)
    for (const c of list) {
      const n = toSafe(stripParen(c.name))
      if (tokens.length > 0 && !tokens.every(t => n.includes(t))) continue
      if (wantLeader && c.type !== 'LEADER') continue
      if (!wantLeader && c.type === 'LEADER') continue
      best = c; break
    }
    return best
  }

  // Essayer avec plusieurs variantes de nom
  for (const variant of nameVariants(baseName)) {
    let found = pickFrom(inSet, variant)
    if (found) return found

    // 2) Fallback: n'importe quel set par nom
    const byName = await prisma.card.findMany({
      where: {
        name: { contains: stripParen(variant), mode: 'insensitive' }
      }
    })
    found = pickFrom(byName, variant)
    if (found) return found

    // 3) Dernier recours: match très permissif sur code qui contient le prefix
    const byCode = await prisma.card.findMany({ where: { code: { contains: prefix } } })
    found = pickFrom(byCode, variant)
    if (found) return found
  }

  return null
}

async function ensureStarterDeck(deck: DeckSpec) {
  const fullName = `${deck.deckCode} : ${deck.deckName}`

  // Supprimer deck existant même nom
  const existing = await prisma.deck.findFirst({ where: { name: fullName } })
  if (existing) {
    await prisma.deck.delete({ where: { id: existing.id } })
  }

  // Créer deck + version
  const created = await prisma.deck.create({ data: { name: fullName, description: `Deck de démarrage ${deck.deckCode}`, userId: null } })
  const version = await prisma.deckVersion.create({ data: { deckId: created.id, name: 'Version initiale' } })

  // Si aucun Leader n'est explicitement indiqué, on considère les cartes en quantité 1 comme candidates Leader
  const hasExplicitLeader = deck.cards.some(c => /leader/i.test(c.name))

  // Accumuler par cardId pour éviter les doublons (contrainte unique deckVersionId+cardId)
  const quantityByCardId = new Map<string, number>()
  for (const spec of deck.cards) {
    const wantLeader = /leader/i.test(spec.name) || (!hasExplicitLeader && spec.quantity === 1)

    let found = await findCardByNameAndSet(spec.name, deck.deckCode, wantLeader)
    if (!found) {
      found = await findCardByNameAndSet(spec.name, deck.deckCode, !wantLeader)
    }
    if (!found) {
      console.warn(`[STARTER][${deck.deckCode}] Carte introuvable: "${spec.name}"`)
      continue
    }

    const prev = quantityByCardId.get(found.id) ?? 0
    quantityByCardId.set(found.id, prev + spec.quantity)
  }

  for (const [cardId, totalQty] of quantityByCardId.entries()) {
    await prisma.deckCard.create({
      data: {
        deckVersionId: version.id,
        cardId,
        quantity: totalQty,
      }
    })
  }

  console.log(`[STARTER] Créé: ${fullName}`)
}

// NOTE: Liste tronquée ici – à compléter avec les 28 decks fournis par l'utilisateur.
// Pour la démo, on inclut ceux visibles dans l'extrait et on peut étendre facilement.
const STARTER_LIST: DeckSpec[] = [
  {
    deckName: 'Straw Hat Crew',
    deckCode: 'ST-01',
    cards: [
      { name: 'Monkey D. Luffy', quantity: 1 },
      { name: 'Usopp', quantity: 4 },
      { name: 'Karoo', quantity: 4 },
      { name: 'Sanji', quantity: 4 },
      { name: 'Jinbe', quantity: 4 },
      { name: 'Tony Tony Chopper', quantity: 4 },
      { name: 'Nami', quantity: 4 },
      { name: 'Nico Robin', quantity: 4 },
      { name: 'Nefeltari Vivi', quantity: 4 },
      { name: 'Franky', quantity: 4 },
      { name: 'Brook', quantity: 2 },
      { name: 'Monkey D. Luffy (character)', quantity: 2 },
      { name: 'Roronoa Zoro', quantity: 2 },
      { name: 'Guard Point', quantity: 2 },
      { name: 'Gum-Gum Jet Pistol', quantity: 2 },
      { name: 'Diable Jambe', quantity: 2 },
      { name: 'Thousand Sunny', quantity: 2 },
    ]
  },
  {
    deckName: 'Worst Generation',
    deckCode: 'ST-02',
    cards: [
      { name: 'Eustass Kid', quantity: 1 },
      { name: 'Vito', quantity: 4 },
      { name: 'Capone Bege', quantity: 4 },
      { name: 'Koby', quantity: 4 },
      { name: 'Jewelry Bonney', quantity: 4 },
      { name: 'Scratchmen Apoo', quantity: 4 },
      { name: 'Heat', quantity: 4 },
      { name: 'Bepo', quantity: 4 },
      { name: 'X Drake', quantity: 4 },
      { name: 'Repel', quantity: 4 },
      { name: 'Urouge', quantity: 2 },
      { name: 'Killer', quantity: 2 },
      { name: 'Trafalgar Law', quantity: 2 },
      { name: 'Basil Hawkins', quantity: 2 },
      { name: 'Eustass Kid (character)', quantity: 2 },
      { name: 'Scalpel', quantity: 2 },
      { name: 'Straw Sword', quantity: 2 },
    ]
  },
  {
    deckName: 'Seven Warlords of the Sea',
    deckCode: 'ST-03',
    cards: [
      { name: 'Crocodile', quantity: 1 },
      { name: 'Edward Weevil', quantity: 4 },
      { name: 'Crocodile (character)', quantity: 2 },
      { name: 'Gecko Moria', quantity: 2 },
      { name: 'Dracule Mihawk', quantity: 2 },
      { name: 'Jinbe', quantity: 4 },
      { name: 'Sentomaru', quantity: 2 },
      { name: 'Trafalgar Law', quantity: 4 },
      { name: 'Donquixote Doflamingo', quantity: 2 },
      { name: 'Bartholomew Kuma', quantity: 4 },
      { name: 'Buggy', quantity: 4 },
      { name: 'Pacifista', quantity: 4 },
      { name: 'Boa Hancock', quantity: 4 },
      { name: 'Marshall D. Teach', quantity: 2 },
      { name: 'Desert Spada', quantity: 4 },
      { name: 'Thrust Pad Cannon', quantity: 4 },
      { name: 'Perfume Femur', quantity: 2 },
    ]
  },
  {
    deckName: 'Animal Kingdom Pirates',
    deckCode: 'ST-04',
    cards: [
      { name: 'Kaido', quantity: 1 },
      { name: 'Ulti', quantity: 4 },
      { name: 'Kaido (character)', quantity: 2 },
      { name: 'King', quantity: 2 },
      { name: 'Queen', quantity: 2 },
      { name: 'Sasaki', quantity: 4 },
      { name: 'Sheepshead', quantity: 4 },
      { name: 'Jack', quantity: 2 },
      { name: 'Ginrummy', quantity: 4 },
      { name: 'Who’s-Who', quantity: 2 },
      { name: 'Black Maria', quantity: 4 },
      { name: 'Page One', quantity: 4 },
      { name: 'X Drake', quantity: 4 },
      { name: 'All-Star ‘Calamity’', quantity: 2 },
      { name: 'Brachio Bomber', quantity: 2 },
      { name: 'Blast Breath', quantity: 4 },
      { name: 'Onigashima', quantity: 4 },
    ]
  },
  {
    deckName: 'ONE PIECE FILM Edition',
    deckCode: 'ST-05',
    cards: [
      { name: 'Shanks', quantity: 1 },
      { name: 'Ain', quantity: 4 },
      { name: 'Ann', quantity: 4 },
      { name: 'Uta', quantity: 2 },
      { name: 'Karina', quantity: 2 },
      { name: 'Guild Tesoro', quantity: 2 },
      { name: 'Gordon', quantity: 4 },
      { name: 'Shiki', quantity: 2 },
      { name: 'Scarlett', quantity: 4 },
      { name: 'Zephyr (Z)', quantity: 2 },
      { name: 'Douglas Bullet', quantity: 2 },
      { name: 'Baccarat', quantity: 4 },
      { name: 'Bins', quantity: 4 },
      { name: 'Buena Festa', quantity: 4 },
      { name: 'Dr. Indigo', quantity: 4 },
      { name: 'Shishi Odoshi Goshojimaki', quantity: 2 },
      { name: 'Armor Mode', quantity: 4 },
    ]
  },
  {
    deckName: 'Absolute Justice',
    deckCode: 'ST-06',
    cards: [
      { name: 'Sakazuki', quantity: 1 },
      { name: 'Koby', quantity: 2 },
      { name: 'Jango', quantity: 4 },
      { name: 'Smoker', quantity: 2 },
      { name: 'Sengoku', quantity: 4 },
      { name: 'Tashigi', quantity: 4 },
      { name: 'Tsuru', quantity: 4 },
      { name: 'Hina', quantity: 2 },
      { name: 'Fullbody', quantity: 4 },
      { name: 'Helmeppo', quantity: 4 },
      { name: 'Momonga', quantity: 4 },
      { name: 'Monkey D. Garp', quantity: 2 },
      { name: 'T-Bone', quantity: 4 },
      { name: 'Shockwave', quantity: 2 },
      { name: 'Great Eruption', quantity: 2 },
      { name: 'White Out', quantity: 4 },
      { name: 'Navy Headquarters', quantity: 2 },
    ]
  },
  {
    deckName: 'Big Mom Pirates',
    deckCode: 'ST-07',
    cards: [
      { name: 'Charlotte Linlin', quantity: 1 },
      { name: 'Charlotte Anana', quantity: 4 },
      { name: 'Charlotte Katakuri', quantity: 2 },
      { name: 'Charlotte Snack', quantity: 4 },
      { name: 'Charlotte Daifuku', quantity: 2 },
      { name: 'Charlotte Flampe', quantity: 4 },
      { name: 'Charlotte Brûlée', quantity: 2 },
      { name: 'Charlotte Pudding', quantity: 4 },
      { name: 'Charlotte Mont-d’Or', quantity: 2 },
      { name: 'Charlotte Linlin (character)', quantity: 2 },
      { name: 'Zeus', quantity: 4 },
      { name: 'Baron Tamago', quantity: 4 },
      { name: 'Prometheus', quantity: 4 },
      { name: 'Pekoms', quantity: 4 },
      { name: 'Soul Pocus', quantity: 4 },
      { name: 'Power Mochi', quantity: 2 },
      { name: 'Queen Mama Chanter', quantity: 2 },
    ]
  },
  {
    deckName: 'Side Monkey D. Luffy',
    deckCode: 'ST-08',
    cards: [
      { name: 'Monkey D. Luffy', quantity: 1 },
      { name: 'Uta', quantity: 2 },
      { name: 'Gaimon', quantity: 4 },
      { name: 'Koby', quantity: 4 },
      { name: 'Shanks', quantity: 2 },
      { name: 'Shirahoshi', quantity: 4 },
      { name: 'Nefeltari Vivi', quantity: 4 },
      { name: 'Higuma', quantity: 4 },
      { name: 'Makino', quantity: 4 },
      { name: 'Monkey D. Garp', quantity: 4 },
      { name: 'Monkey D. Luffy (character)', quantity: 4 },
      { name: 'Laboon', quantity: 4 },
      { name: 'Mr. 2 Bon Kurei (Bentham)', quantity: 4 },
      { name: 'Gum-Gum Bell', quantity: 4 },
      { name: 'Gum-Gum Pistol', quantity: 2 },
    ]
  },
  {
    deckName: 'Side Yamato',
    deckCode: 'ST-09',
    cards: [
      { name: 'Yamato', quantity: 1 },
      { name: 'Kozuki Oden', quantity: 4 },
      { name: 'Shinobu', quantity: 2 },
      { name: 'Kin’emon', quantity: 4 },
      { name: 'Inuarashi', quantity: 4 },
      { name: 'Nekomamushi', quantity: 4 },
      { name: 'Ashura Doji', quantity: 4 },
      { name: 'Kikunojo', quantity: 4 },
      { name: 'Raizo', quantity: 4 },
      { name: 'Izo', quantity: 2 },
      { name: 'Momonosuke', quantity: 4 },
      { name: 'Shogun Frankie (General Franky)', quantity: 2 },
      { name: 'Toki', quantity: 4 },
      { name: 'Akazaya Nine Gathering', quantity: 2 },
      { name: 'Paradise Totsuka', quantity: 4 },
      { name: 'Onigashima’s Ambush', quantity: 2 },
    ]
  },
  {
    deckName: 'Ultimate Deck - The Three Captains',
    deckCode: 'ST-10',
    cards: [
      { name: 'Monkey D. Luffy (Leader)', quantity: 1 },
      { name: 'Trafalgar Law (Leader)', quantity: 1 },
      { name: 'Eustass Kid (Leader)', quantity: 1 },
      { name: 'Monkey D. Luffy (character)', quantity: 4 },
      { name: 'Trafalgar Law (character)', quantity: 4 },
      { name: 'Eustass Kid (character)', quantity: 4 },
      { name: 'Boa Hancock', quantity: 4 },
      { name: 'Dracule Mihawk', quantity: 4 },
      { name: 'Edward Newgate', quantity: 4 },
      { name: 'Charlotte Linlin', quantity: 4 },
      { name: 'Kaido', quantity: 4 },
      { name: 'Yamato (character)', quantity: 4 },
      { name: 'Shanks (character)', quantity: 4 },
      { name: 'Porchemy', quantity: 4 },
      { name: 'Red-Haired Pirates', quantity: 4 },
      { name: 'Straw Hat Crew', quantity: 4 },
      { name: 'Worst Generation', quantity: 4 },
    ]
  },
  {
    deckName: 'Ultra Deck - Uta',
    deckCode: 'ST-11',
    cards: [
      { name: 'Uta', quantity: 1 },
      { name: 'Uta (FILM Leader)', quantity: 1 },
      { name: 'Buena Festa', quantity: 4 },
      { name: 'Guild Tesoro', quantity: 4 },
      { name: 'Shiki', quantity: 4 },
      { name: 'Douglas Bullet', quantity: 4 },
      { name: 'Zephyr (Z)', quantity: 4 },
      { name: 'Gordon', quantity: 4 },
      { name: 'Harry', quantity: 4 },
      { name: 'Uta’s New Genesis', quantity: 4 },
      { name: 'Uta’s Song: I’m Invincible', quantity: 4 },
    ]
  },
  {
    deckName: 'Starter Deck - Zoro & Sanji',
    deckCode: 'ST-12',
    cards: [
      { name: 'Roronoa Zoro & Sanji', quantity: 1 },
      { name: 'Kuina', quantity: 4 },
      { name: 'Dracule Mihawk', quantity: 2 },
      { name: 'Humandrill', quantity: 4 },
      { name: 'Perona', quantity: 4 },
      { name: 'Yosaku & Johnny', quantity: 4 },
      { name: 'Rika', quantity: 4 },
      { name: 'Roronoa Zoro (character)', quantity: 2 },
      { name: 'Elephant Tuna', quantity: 4 },
      { name: 'Emporio Ivankov', quantity: 2 },
      { name: 'Sanji (character)', quantity: 2 },
      { name: 'Charlotte Pudding', quantity: 4 },
      { name: 'Zeff', quantity: 4 },
      { name: 'Duval', quantity: 2 },
      { name: 'Patty & Carne', quantity: 4 },
      { name: 'Shishi Sonson', quantity: 2 },
      { name: 'Mouton Shot', quantity: 2 },
    ]
  },
  {
    deckName: 'Ultimate Deck - The Three Brothers',
    deckCode: 'ST-13',
    cards: [
      { name: 'Monkey D. Luffy (Black/Yellow Leader)', quantity: 1 },
      { name: 'Portgas D. Ace (Blue/Yellow Leader)', quantity: 1 },
      { name: 'Sabo (Red/Yellow Leader)', quantity: 1 },
      { name: 'Monkey D. Luffy (character)', quantity: 4 },
      { name: 'Portgas D. Ace (character)', quantity: 4 },
      { name: 'Sabo (character)', quantity: 4 },
      { name: 'Ivankov', quantity: 4 },
      { name: 'Koala', quantity: 4 },
      { name: 'Hack', quantity: 4 },
      { name: 'Morley', quantity: 4 },
      { name: 'Lindbergh', quantity: 4 },
      { name: 'Belo Betty', quantity: 4 },
      { name: 'Sabotage Plan', quantity: 4 },
      { name: 'Fire Fist', quantity: 4 },
      { name: 'Gum-Gum Red Hawk', quantity: 4 },
      { name: 'Mera Mera no Mi (Flame-Flame Fruit)', quantity: 4 },
    ]
  },
  {
    deckName: 'Starter Deck - 3D2Y',
    deckCode: 'ST-14',
    cards: [
      { name: 'Monkey D. Luffy', quantity: 1 },
      { name: 'Usopp', quantity: 4 },
      { name: 'Sanji', quantity: 2 },
      { name: 'Jinbe', quantity: 4 },
      { name: 'Tony Tony Chopper', quantity: 4 },
      { name: 'Nami', quantity: 2 },
      { name: 'Nico Robin', quantity: 4 },
      { name: 'Heracles', quantity: 4 },
      { name: 'Franky', quantity: 4 },
      { name: 'Brook', quantity: 4 },
      { name: 'Hercules', quantity: 4 },
      { name: 'Monkey D. Luffy (Gear 2)', quantity: 2 },
      { name: 'Roronoa Zoro', quantity: 4 },
      { name: 'Gum-Gum Giant Whip', quantity: 2 },
      { name: 'Gum-Gum Diable Three-Sword Phoenix', quantity: 2 },
      { name: 'Friends’ Sake Cups!!', quantity: 2 },
      { name: 'Thousand Sunny', quantity: 2 },
    ]
  },
  {
    deckName: 'Deck de démarrage Rouge : Edward Newgate',
    deckCode: 'ST-15',
    cards: [
      { name: 'Edward Newgate', quantity: 1 },
      { name: 'Atmos', quantity: 4 },
      { name: 'Edward Newgate (personnage)', quantity: 2 },
      { name: 'Kingdew', quantity: 4 },
      { name: 'Thatch', quantity: 2 },
      { name: 'Portgas D. Ace', quantity: 2 },
      { name: 'Jozu', quantity: 4 },
      { name: 'Marco', quantity: 4 },
      { name: 'Rakuyo', quantity: 4 },
      { name: 'Izo', quantity: 4 },
      { name: 'Speed Jil', quantity: 4 },
      { name: 'Namur', quantity: 4 },
      { name: 'Haruta', quantity: 4 },
      { name: 'Fossa', quantity: 4 },
      { name: '« Tu es peut-être un idiot… »', quantity: 4 },
    ]
  },
  {
    deckName: 'Deck de démarrage Vert : Uta',
    deckCode: 'ST-16',
    cards: [
      { name: 'Uta', quantity: 1 },
      { name: 'Uta (personnage)', quantity: 2 },
      { name: 'Gordon', quantity: 4 },
      { name: 'Charlotte Katakuri', quantity: 4 },
      { name: 'Shanks', quantity: 2 },
      { name: 'Monkey D. Luffy', quantity: 2 },
      { name: 'Bartolomeo', quantity: 4 },
      { name: 'Monkey D. Luffy (Promo)', quantity: 4 },
      { name: 'Backlight', quantity: 4 },
      { name: 'Nouvelle ère', quantity: 4 },
      { name: 'Je suis invincible!', quantity: 4 },
    ]
  },
  {
    deckName: 'Deck de démarrage Bleu : Donquichotte Doflamingo',
    deckCode: 'ST-17',
    cards: [
      { name: 'Donquichotte Doflamingo', quantity: 1 },
      { name: 'Crocodile', quantity: 4 },
      { name: 'Trafalgar Law', quantity: 2 },
      { name: 'Buggy', quantity: 2 },
      { name: 'Boa Hancock', quantity: 2 },
      { name: 'Marshall D. Teach', quantity: 4 },
      { name: 'Donquichotte Doflamingo (personnage)', quantity: 4 },
      { name: 'Gecko Moria', quantity: 4 },
      { name: 'Bartholomew Kuma', quantity: 4 },
      { name: 'Trafalgar Law (ST-03)', quantity: 4 },
      { name: 'Edward Weevil', quantity: 4 },
      { name: 'Gecko Moria (ST-03)', quantity: 4 },
      { name: 'Dracule Mihawk', quantity: 4 },
      { name: 'Jinbe', quantity: 4 },
      { name: 'Overheat', quantity: 4 },
    ]
  },
  {
    deckName: 'Deck de démarrage Violet : Monkey D. Luffy',
    deckCode: 'ST-18',
    cards: [
      { name: 'Monkey D. Luffy', quantity: 1 },
      { name: 'Usopp (Usohachi)', quantity: 2 },
      { name: 'Nami (O-Nami)', quantity: 4 },
      { name: 'Sanji (Sangoro)', quantity: 4 },
      { name: 'Zoro (Zorojuro)', quantity: 2 },
      { name: 'Luffy (Luffytaro)', quantity: 2 },
      { name: 'Usopp (Usohachi – reprint)', quantity: 4 },
      { name: 'Nico Robin (O-Robi)', quantity: 4 },
      { name: 'Jinbe', quantity: 4 },
      { name: 'Zoro (Zorojuro – rare)', quantity: 4 },
      { name: 'Chopper (Chopaemon)', quantity: 4 },
      { name: 'Franky (Fura no-suke)', quantity: 4 },
      { name: 'Brook (Bone Kichi)', quantity: 4 },
      { name: 'Monkey D. Luffy (Promo)', quantity: 4 },
      { name: '« En mer, tu affrontes des pirates ! »', quantity: 4 },
    ]
  },
  {
    deckName: 'Deck de démarrage Noir : Smoker',
    deckCode: 'ST-19',
    cards: [
      { name: 'Smoker', quantity: 1 },
      { name: 'Tashigi', quantity: 4 },
      { name: 'Smoker (character)', quantity: 2 },
      { name: 'Hina', quantity: 2 },
      { name: 'Vergo', quantity: 4 },
      { name: 'Momousagi (Gion)', quantity: 4 },
      { name: 'Tokikake', quantity: 4 },
      { name: 'Kuzan (Aokiji)', quantity: 2 },
      { name: 'Borsalino (Kizaru)', quantity: 2 },
      { name: 'Sakazuki (Akainu)', quantity: 2 },
      { name: 'Issho (Fujitora)', quantity: 2 },
      { name: 'X Drake (Navy)', quantity: 4 },
      { name: '« Smoker, en action ! »', quantity: 4 },
      { name: 'Plume-Plume : White Blow', quantity: 4 },
      { name: 'Salle d’Embrasement', quantity: 2 },
    ]
  },
  {
    deckName: 'Deck de démarrage Jaune : Charlotte Katakuri',
    deckCode: 'ST-20',
    cards: [
      { name: 'Charlotte Katakuri', quantity: 1 },
      { name: 'Charlotte Cracker', quantity: 4 },
      { name: 'Charlotte Perospero', quantity: 4 },
      { name: 'Charlotte Smoothie', quantity: 2 },
      { name: 'Charlotte Pudding', quantity: 4 },
      { name: 'Charlotte Brûlée', quantity: 4 },
      { name: 'Charlotte Anana', quantity: 2 },
      { name: 'Charlotte Galette', quantity: 4 },
      { name: 'Charlotte Opera', quantity: 4 },
      { name: 'Charlotte Linlin (character)', quantity: 2 },
      { name: 'Bobbin', quantity: 4 },
      { name: 'Charlotte Mondée', quantity: 4 },
      { name: 'Charlotte Broyé', quantity: 4 },
      { name: 'Charlotte Compote', quantity: 4 },
      { name: '« Mont d’Or, active la prison de livres ! »', quantity: 4 },
    ]
  },
  {
    deckName: 'Deck de démarrage EX - Gear 5',
    deckCode: 'ST-21',
    cards: [
      { name: 'Monkey D. Luffy (Gear 5)', quantity: 1 },
      { name: 'Hyogoro', quantity: 4 },
      { name: 'Bepo', quantity: 2 },
      { name: 'Killer', quantity: 4 },
      { name: 'Jinbe', quantity: 2 },
      { name: 'Caribou', quantity: 4 },
      { name: 'Marguerite', quantity: 4 },
      { name: 'Boa Hancock', quantity: 2 },
      { name: 'Bartholomew Kuma', quantity: 4 },
      { name: 'Cavendish', quantity: 4 },
      { name: 'Bartolomeo', quantity: 4 },
      { name: 'Donquichotte Rosinante', quantity: 4 },
      { name: 'Byrndi World', quantity: 4 },
      { name: 'Chinjao', quantity: 4 },
      { name: 'Canon Gomu Gomu', quantity: 4 },
      { name: 'Roi Kong Gun', quantity: 4 },
    ]
  },
  {
    deckName: 'Deck de démarrage EX - Ace & Newgate',
    deckCode: 'ST-22',
    cards: [
      { name: 'Portgas D. Ace & Edward Newgate', quantity: 1 },
      { name: 'Portgas D. Ace (character)', quantity: 4 },
      { name: 'Edward Newgate (character)', quantity: 4 },
      { name: 'Whitey Bay', quantity: 4 },
      { name: 'Oars Jr.', quantity: 4 },
      { name: 'Little Oars Jr.', quantity: 4 },
      { name: 'Thunderlord McGuy', quantity: 4 },
      { name: 'Great Eruption', quantity: 4 },
      { name: 'Flame Emperor', quantity: 4 },
      { name: '« On n’arrête pas d’hériter de la volonté ! »', quantity: 4 },
      { name: 'Battle of Marineford', quantity: 4 },
    ]
  },
  {
    deckName: 'Deck de démarrage Rouge : Shanks',
    deckCode: 'ST-23',
    cards: [
      { name: 'Shanks', quantity: 1 },
      { name: 'Uta', quantity: 4 },
      { name: 'Benn Beckman', quantity: 2 },
      { name: 'Lucky Roo', quantity: 4 },
      { name: 'Yasopp', quantity: 4 },
      { name: 'Limejuice', quantity: 4 },
      { name: 'Bonk Punch', quantity: 4 },
      { name: 'Monster (Red Hair)', quantity: 4 },
      { name: 'Building Snake', quantity: 4 },
      { name: 'Hongo', quantity: 4 },
      { name: 'Howling Gab', quantity: 4 },
      { name: 'Daruma', quantity: 4 },
      { name: 'Shanks (character)', quantity: 2 },
      { name: 'Roger’s Legacy', quantity: 4 },
      { name: 'Red-Hair Pirates’ Sake Cup', quantity: 4 },
    ]
  },
  {
    deckName: 'Deck de démarrage Vert : Jewelry Bonney',
    deckCode: 'ST-24',
    cards: [
      { name: 'Jewelry Bonney', quantity: 1 },
      { name: 'Eustass Kid', quantity: 4 },
      { name: 'Killer', quantity: 2 },
      { name: 'Roronoa Zoro', quantity: 4 },
      { name: 'Basil Hawkins', quantity: 2 },
      { name: 'Scratchmen Apoo', quantity: 4 },
      { name: 'Capone Bege', quantity: 2 },
      { name: 'Urouge', quantity: 4 },
      { name: 'X Drake', quantity: 4 },
      { name: 'Heat', quantity: 2 },
      { name: 'Bepo', quantity: 4 },
      { name: 'Shachi', quantity: 4 },
      { name: 'Penguin', quantity: 4 },
      { name: 'Jean Bart', quantity: 4 },
      { name: 'Wire', quantity: 4 },
      { name: '« La pire génération est réunie ! »', quantity: 4 },
    ]
  },
  {
    deckName: 'Deck de démarrage Bleu : Buggy',
    deckCode: 'ST-25',
    cards: [
      { name: 'Buggy', quantity: 1 },
      { name: 'Dracule Mihawk', quantity: 4 },
      { name: 'Mr. 3 (Galdino)', quantity: 4 },
      { name: 'Crocodile', quantity: 2 },
      { name: 'Don Quichotte Doflamingo', quantity: 4 },
      { name: 'Boa Hancock', quantity: 2 },
      { name: 'Bartholomew Kuma', quantity: 4 },
      { name: 'Rob Lucci', quantity: 2 },
      { name: 'Kaku', quantity: 4 },
      { name: 'Blueno', quantity: 4 },
      { name: 'Jabra', quantity: 4 },
      { name: 'Kumadori', quantity: 4 },
      { name: 'Fukuro', quantity: 4 },
      { name: 'Kalifa', quantity: 4 },
      { name: '« L’évasion d’Impel Down ! »', quantity: 4 },
    ]
  },
  {
    deckName: 'Deck de démarrage Violet/Noir : Monkey D. Luffy',
    deckCode: 'ST-26',
    cards: [
      { name: 'Monkey D. Luffy', quantity: 1 },
      { name: 'Crocodile', quantity: 4 },
      { name: 'Marshall D. Teach', quantity: 4 },
      { name: 'Jesus Burgess', quantity: 4 },
      { name: 'Shiliew', quantity: 4 },
      { name: 'Laffitte', quantity: 4 },
      { name: 'Catarina Devon', quantity: 4 },
      { name: 'Sanjuan Wolf', quantity: 4 },
      { name: 'Avalo Pizarro', quantity: 4 },
      { name: 'Vasco Shot', quantity: 4 },
      { name: 'Doc Q', quantity: 4 },
      { name: 'Van Augur', quantity: 4 },
      { name: '« L’équipage du Chapeau de Paille se reforme ! »', quantity: 4 },
      { name: '« La pire génération contre-attaque ! »', quantity: 4 },
    ]
  },
  {
    deckName: 'Deck de démarrage Noir : Marshall D. Teach',
    deckCode: 'ST-27',
    cards: [
      { name: 'Marshall D. Teach', quantity: 1 },
      { name: 'Magellan', quantity: 4 },
      { name: 'Shiryu', quantity: 4 },
      { name: 'Hannyabal', quantity: 4 },
      { name: 'Domino', quantity: 2 },
      { name: 'Saldeath', quantity: 4 },
      { name: 'Sadi', quantity: 2 },
      { name: 'Minotaurus', quantity: 4 },
      { name: 'Minokoala', quantity: 4 },
      { name: 'Minozebra', quantity: 4 },
      { name: 'Minorhinoceros', quantity: 4 },
      { name: '« Impel Down – Le plan d’évasion commence ! »', quantity: 4 },
      { name: 'Judgment of Hell', quantity: 4 },
    ]
  },
  {
    deckName: 'Deck de démarrage Vert/Jaune : Yamato',
    deckCode: 'ST-28',
    cards: [
      { name: 'Yamato', quantity: 1 },
      { name: 'Oden Kozuki', quantity: 4 },
      { name: 'Ashura Doji', quantity: 4 },
      { name: 'Kawamatsu', quantity: 4 },
      { name: 'Denjiro', quantity: 4 },
      { name: 'Izou', quantity: 4 },
      { name: 'Kiku', quantity: 4 },
      { name: 'Kin’emon', quantity: 4 },
      { name: 'Shinobu', quantity: 4 },
      { name: 'Kanjuro', quantity: 4 },
      { name: 'Raizo', quantity: 4 },
      { name: 'Onimaru', quantity: 4 },
      { name: 'Hiyori Kozuki', quantity: 4 },
      { name: 'Tokugawa', quantity: 4 },
      { name: '« La bataille décisive de Onigashima »', quantity: 4 },
    ]
  },
]

async function main() {
  try {
    const reset = process.argv.includes('--reset')
    if (reset) {
      console.log('[STARTER] Suppression des decks ST-* existants…')
      const existing = await prisma.deck.findMany({ where: { name: { startsWith: 'ST-' } } })
      for (const d of existing) {
        await prisma.deck.delete({ where: { id: d.id } })
      }
    }

    for (const d of STARTER_LIST) {
      await ensureStarterDeck(d)
    }

    console.log('[STARTER] Reconstruction terminée.')
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()


