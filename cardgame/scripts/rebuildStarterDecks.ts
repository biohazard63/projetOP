import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import productEvidence from './starterAudit/product-evidence.json'
import { auditDeck, type CatalogCard, type DeckSpec, type ProductEvidence } from './starterAudit/validation'

// Audited commercial contents. Quantities are explicit published counts, never inferred from cardlist size.
// ST-36 is intentionally absent: no sufficiently verified per-card quantity source was located.
// No write/import path exists here. Existing decks, variants and personal decks remain untouched.
export const STARTER_LIST: DeckSpec[] = [
  {
    deckName: 'Straw Hat Crew',
    deckCode: 'ST-01',
    cards: [
      { name: 'Monkey.D.Luffy', quantity: 1, cardNumber: 'ST01-001', type: 'LEADER', printingCode: 'ST01-001' },
      { name: 'Usopp', quantity: 4, cardNumber: 'ST01-002', type: 'CHARACTER', printingCode: 'ST01-002' },
      { name: 'Karoo', quantity: 4, cardNumber: 'ST01-003', type: 'CHARACTER', printingCode: 'ST01-003' },
      { name: 'Sanji', quantity: 4, cardNumber: 'ST01-004', type: 'CHARACTER', printingCode: 'ST01-004' },
      { name: 'Jinbe', quantity: 4, cardNumber: 'ST01-005', type: 'CHARACTER', printingCode: 'ST01-005' },
      { name: 'Tony-Tony Chopper', quantity: 4, cardNumber: 'ST01-006', type: 'CHARACTER', printingCode: 'ST01-006' },
      { name: 'Nami', quantity: 4, cardNumber: 'ST01-007', type: 'CHARACTER', printingCode: 'ST01-007' },
      { name: 'Nico Robin', quantity: 4, cardNumber: 'ST01-008', type: 'CHARACTER', printingCode: 'ST01-008' },
      { name: 'Nefeltari Vivi', quantity: 4, cardNumber: 'ST01-009', type: 'CHARACTER', printingCode: 'ST01-009' },
      { name: 'Franky', quantity: 4, cardNumber: 'ST01-010', type: 'CHARACTER', printingCode: 'ST01-010' },
      { name: 'Brook', quantity: 2, cardNumber: 'ST01-011', type: 'CHARACTER', printingCode: 'ST01-011' },
      { name: 'Monkey D. Luffy', quantity: 2, cardNumber: 'ST01-012', type: 'CHARACTER', printingCode: 'ST01-012' },
      { name: 'Roronoa Zoro', quantity: 2, cardNumber: 'ST01-013', type: 'CHARACTER', printingCode: 'ST01-013' },
      { name: 'Guard Point', quantity: 2, cardNumber: 'ST01-014', type: 'EVENT', printingCode: 'ST01-014' },
      { name: 'Gum-Gum Jet Pistol', quantity: 2, cardNumber: 'ST01-015', type: 'EVENT', printingCode: 'ST01-015' },
      { name: 'Diable Jambe', quantity: 2, cardNumber: 'ST01-016', type: 'EVENT', printingCode: 'ST01-016' },
      { name: 'Thousand Sunny', quantity: 2, cardNumber: 'ST01-017', type: 'STAGE', printingCode: 'ST01-017' },
    ]
  },
  {
    deckName: 'Worst Generation',
    deckCode: 'ST-02',
    cards: [
      { name: 'Eustass"Captain"Kid', quantity: 1, cardNumber: 'ST02-001', type: 'LEADER', printingCode: 'ST02-001' },
      { name: 'Vito', quantity: 4, cardNumber: 'ST02-002', type: 'CHARACTER', printingCode: 'ST02-002' },
      { name: 'Urouge', quantity: 2, cardNumber: 'ST02-003', type: 'CHARACTER', printingCode: 'ST02-003' },
      { name: 'Capone "Gang" Bege', quantity: 4, cardNumber: 'ST02-004', type: 'CHARACTER', printingCode: 'ST02-004' },
      { name: 'Killer', quantity: 2, cardNumber: 'ST02-005', type: 'CHARACTER', printingCode: 'ST02-005' },
      { name: 'Koby', quantity: 4, cardNumber: 'ST02-006', type: 'CHARACTER', printingCode: 'ST02-006' },
      { name: 'Jewelry Bonney', quantity: 4, cardNumber: 'ST02-007', type: 'CHARACTER', printingCode: 'ST02-007' },
      { name: 'Scratchmen Apoo', quantity: 4, cardNumber: 'ST02-008', type: 'CHARACTER', printingCode: 'ST02-008' },
      { name: 'Trafalgar Law', quantity: 2, cardNumber: 'ST02-009', type: 'CHARACTER', printingCode: 'ST02-009' },
      { name: 'Basil Hawkins', quantity: 2, cardNumber: 'ST02-010', type: 'CHARACTER', printingCode: 'ST02-010' },
      { name: 'Heat', quantity: 4, cardNumber: 'ST02-011', type: 'CHARACTER', printingCode: 'ST02-011' },
      { name: 'Bepo', quantity: 4, cardNumber: 'ST02-012', type: 'CHARACTER', printingCode: 'ST02-012' },
      { name: 'Eustass"Captain"Kid', quantity: 2, cardNumber: 'ST02-013', type: 'CHARACTER', printingCode: 'ST02-013' },
      { name: 'X.Drake', quantity: 4, cardNumber: 'ST02-014', type: 'CHARACTER', printingCode: 'ST02-014' },
      { name: 'Scalpel', quantity: 2, cardNumber: 'ST02-015', type: 'EVENT', printingCode: 'ST02-015' },
      { name: 'Repel', quantity: 4, cardNumber: 'ST02-016', type: 'EVENT', printingCode: 'ST02-016' },
      { name: 'Straw Sword', quantity: 2, cardNumber: 'ST02-017', type: 'EVENT', printingCode: 'ST02-017' },
    ]
  },
  {
    deckName: 'The Seven Warlords of the Sea',
    deckCode: 'ST-03',
    cards: [
      { name: 'Crocodile', quantity: 1, cardNumber: 'ST03-001', type: 'LEADER', printingCode: 'ST03-001' },
      { name: 'Edward Weeble', quantity: 4, cardNumber: 'ST03-002', type: 'CHARACTER', printingCode: 'ST03-002' },
      { name: 'Crocodile', quantity: 2, cardNumber: 'ST03-003', type: 'CHARACTER', printingCode: 'ST03-003' },
      { name: 'Gecko Moria', quantity: 2, cardNumber: 'ST03-004', type: 'CHARACTER', printingCode: 'ST03-004' },
      { name: 'Dracule Mihawk', quantity: 2, cardNumber: 'ST03-005', type: 'CHARACTER', printingCode: 'ST03-005' },
      { name: 'Jinbe', quantity: 4, cardNumber: 'ST03-006', type: 'CHARACTER', printingCode: 'ST03-006' },
      { name: 'Sentomaru', quantity: 2, cardNumber: 'ST03-007', type: 'CHARACTER', printingCode: 'ST03-007' },
      { name: 'Trafalgar Law', quantity: 4, cardNumber: 'ST03-008', type: 'CHARACTER', printingCode: 'ST03-008' },
      { name: 'Donquixote Doflamingo', quantity: 2, cardNumber: 'ST03-009', type: 'CHARACTER', printingCode: 'ST03-009' },
      { name: 'Bartholomew Kuma', quantity: 4, cardNumber: 'ST03-010', type: 'CHARACTER', printingCode: 'ST03-010' },
      { name: 'Buggy', quantity: 4, cardNumber: 'ST03-011', type: 'CHARACTER', printingCode: 'ST03-011' },
      { name: 'Pacifista', quantity: 4, cardNumber: 'ST03-012', type: 'CHARACTER', printingCode: 'ST03-012' },
      { name: 'Boa Hancock', quantity: 4, cardNumber: 'ST03-013', type: 'CHARACTER', printingCode: 'ST03-013' },
      { name: 'Marshall.D.Teach', quantity: 2, cardNumber: 'ST03-014', type: 'CHARACTER', printingCode: 'ST03-014' },
      { name: 'Sables', quantity: 4, cardNumber: 'ST03-015', type: 'EVENT', printingCode: 'ST03-015' },
      { name: 'Thrust Pad Cannon', quantity: 4, cardNumber: 'ST03-016', type: 'EVENT', printingCode: 'ST03-016' },
      { name: 'Love-Love Mellow', quantity: 2, cardNumber: 'ST03-017', type: 'EVENT', printingCode: 'ST03-017' },
    ]
  },
  {
    deckName: 'Animal Kingdom Pirates',
    deckCode: 'ST-04',
    cards: [
      { name: 'Kaido', quantity: 1, cardNumber: 'ST04-001', type: 'LEADER', printingCode: 'ST04-001' },
      { name: 'Ulti', quantity: 4, cardNumber: 'ST04-002', type: 'CHARACTER', printingCode: 'ST04-002' },
      { name: 'Kaido', quantity: 2, cardNumber: 'ST04-003', type: 'CHARACTER', printingCode: 'ST04-003' },
      { name: 'King', quantity: 2, cardNumber: 'ST04-004', type: 'CHARACTER', printingCode: 'ST04-004' },
      { name: 'Queen', quantity: 2, cardNumber: 'ST04-005', type: 'CHARACTER', printingCode: 'ST04-005' },
      { name: 'Sasaki', quantity: 4, cardNumber: 'ST04-006', type: 'CHARACTER', printingCode: 'ST04-006' },
      { name: 'Sheepshead', quantity: 4, cardNumber: 'ST04-007', type: 'CHARACTER', printingCode: 'ST04-007' },
      { name: 'Jack', quantity: 2, cardNumber: 'ST04-008', type: 'CHARACTER', printingCode: 'ST04-008' },
      { name: 'Ginrummy', quantity: 4, cardNumber: 'ST04-009', type: 'CHARACTER', printingCode: 'ST04-009' },
      { name: 'Who\'s.Who', quantity: 2, cardNumber: 'ST04-010', type: 'CHARACTER', printingCode: 'ST04-010' },
      { name: 'Black Maria', quantity: 4, cardNumber: 'ST04-011', type: 'CHARACTER', printingCode: 'ST04-011' },
      { name: 'Page One', quantity: 4, cardNumber: 'ST04-012', type: 'CHARACTER', printingCode: 'ST04-012' },
      { name: 'X.Drake', quantity: 4, cardNumber: 'ST04-013', type: 'CHARACTER', printingCode: 'ST04-013' },
      { name: 'Lead Performer "Disaster"', quantity: 2, cardNumber: 'ST04-014', type: 'EVENT', printingCode: 'ST04-014' },
      { name: 'Brachio Bomber', quantity: 2, cardNumber: 'ST04-015', type: 'EVENT', printingCode: 'ST04-015' },
      { name: 'Souffle ardent', quantity: 4, cardNumber: 'ST04-016', type: 'EVENT', printingCode: 'ST04-016' },
      { name: 'Onigashima Island', quantity: 4, cardNumber: 'ST04-017', type: 'STAGE', printingCode: 'ST04-017' },
    ]
  },
  {
    deckName: 'ONE PIECE FILM edition',
    deckCode: 'ST-05',
    cards: [
      { name: 'Shanks', quantity: 1, cardNumber: 'ST05-001', type: 'LEADER', printingCode: 'ST05-001' },
      { name: 'Ain', quantity: 4, cardNumber: 'ST05-002', type: 'CHARACTER', printingCode: 'ST05-002' },
      { name: 'Ann', quantity: 4, cardNumber: 'ST05-003', type: 'CHARACTER', printingCode: 'ST05-003' },
      { name: 'Uta', quantity: 2, cardNumber: 'ST05-004', type: 'CHARACTER', printingCode: 'ST05-004' },
      { name: 'Carina', quantity: 2, cardNumber: 'ST05-005', type: 'CHARACTER', printingCode: 'ST05-005' },
      { name: 'Gild Tesoro', quantity: 2, cardNumber: 'ST05-006', type: 'CHARACTER', printingCode: 'ST05-006' },
      { name: 'Gordon', quantity: 4, cardNumber: 'ST05-007', type: 'CHARACTER', printingCode: 'ST05-007' },
      { name: 'Shiki', quantity: 2, cardNumber: 'ST05-008', type: 'CHARACTER', printingCode: 'ST05-008' },
      { name: 'Scarlet', quantity: 4, cardNumber: 'ST05-009', type: 'CHARACTER', printingCode: 'ST05-009' },
      { name: 'Zephyr', quantity: 2, cardNumber: 'ST05-010', type: 'CHARACTER', printingCode: 'ST05-010' },
      { name: 'Douglas Bullet', quantity: 2, cardNumber: 'ST05-011', type: 'CHARACTER', printingCode: 'ST05-011' },
      { name: 'Baccarat', quantity: 4, cardNumber: 'ST05-012', type: 'CHARACTER', printingCode: 'ST05-012' },
      { name: 'Bins', quantity: 4, cardNumber: 'ST05-013', type: 'CHARACTER', printingCode: 'ST05-013' },
      { name: 'Buena Festa', quantity: 4, cardNumber: 'ST05-014', type: 'CHARACTER', printingCode: 'ST05-014' },
      { name: 'Dr. Indigo', quantity: 4, cardNumber: 'ST05-015', type: 'CHARACTER', printingCode: 'ST05-015' },
      { name: 'Lion\'s Threat Imperial Earth Bind', quantity: 2, cardNumber: 'ST05-016', type: 'EVENT', printingCode: 'ST05-016' },
      { name: 'Union Armada', quantity: 4, cardNumber: 'ST05-017', type: 'EVENT', printingCode: 'ST05-017' },
    ]
  },
  {
    deckName: 'Absolute Justice',
    deckCode: 'ST-06',
    cards: [
      { name: 'Sakazuki', quantity: 1, cardNumber: 'ST06-001', type: 'LEADER', printingCode: 'ST06-001' },
      { name: 'Koby', quantity: 2, cardNumber: 'ST06-002', type: 'CHARACTER', printingCode: 'ST06-002' },
      { name: 'Jango', quantity: 4, cardNumber: 'ST06-003', type: 'CHARACTER', printingCode: 'ST06-003' },
      { name: 'Smoker', quantity: 2, cardNumber: 'ST06-004', type: 'CHARACTER', printingCode: 'ST06-004' },
      { name: 'Sengoku', quantity: 4, cardNumber: 'ST06-005', type: 'CHARACTER', printingCode: 'ST06-005' },
      { name: 'Tashigi', quantity: 4, cardNumber: 'ST06-006', type: 'CHARACTER', printingCode: 'ST06-006' },
      { name: 'Tsuru', quantity: 4, cardNumber: 'ST06-007', type: 'CHARACTER', printingCode: 'ST06-007' },
      { name: 'Hina', quantity: 2, cardNumber: 'ST06-008', type: 'CHARACTER', printingCode: 'ST06-008' },
      { name: 'Fullbody', quantity: 4, cardNumber: 'ST06-009', type: 'CHARACTER', printingCode: 'ST06-009' },
      { name: 'Hermep', quantity: 4, cardNumber: 'ST06-010', type: 'CHARACTER', printingCode: 'ST06-010' },
      { name: 'Momonga', quantity: 4, cardNumber: 'ST06-011', type: 'CHARACTER', printingCode: 'ST06-011' },
      { name: 'Monkey.D.Garp', quantity: 2, cardNumber: 'ST06-012', type: 'CHARACTER', printingCode: 'ST06-012' },
      { name: 'T-Bone', quantity: 4, cardNumber: 'ST06-013', type: 'CHARACTER', printingCode: 'ST06-013' },
      { name: 'Onde de choc', quantity: 2, cardNumber: 'ST06-014', type: 'EVENT', printingCode: 'ST06-014' },
      { name: 'Great Eruption', quantity: 2, cardNumber: 'ST06-015', type: 'EVENT', printingCode: 'ST06-015' },
      { name: 'White Out', quantity: 4, cardNumber: 'ST06-016', type: 'EVENT', printingCode: 'ST06-016' },
      { name: 'Navy HQ', quantity: 2, cardNumber: 'ST06-017', type: 'STAGE', printingCode: 'ST06-017' },
    ]
  },
  {
    deckName: 'Big Mom Pirates',
    deckCode: 'ST-07',
    cards: [
      { name: 'Charlotte Linlin', quantity: 1, cardNumber: 'ST07-001', type: 'LEADER', printingCode: 'ST07-001' },
      { name: 'Charlotte Anana', quantity: 4, cardNumber: 'ST07-002', type: 'CHARACTER', printingCode: 'ST07-002' },
      { name: 'Charlotte Katakuri', quantity: 2, cardNumber: 'ST07-003', type: 'CHARACTER', printingCode: 'ST07-003' },
      { name: 'Charlotte Snack', quantity: 4, cardNumber: 'ST07-004', type: 'CHARACTER', printingCode: 'ST07-004' },
      { name: 'Charlotte Daifuku', quantity: 2, cardNumber: 'ST07-005', type: 'CHARACTER', printingCode: 'ST07-005' },
      { name: 'Charlotte Flampe', quantity: 4, cardNumber: 'ST07-006', type: 'CHARACTER', printingCode: 'ST07-006' },
      { name: 'Charlotte Brûlée', quantity: 2, cardNumber: 'ST07-007', type: 'CHARACTER', printingCode: 'ST07-007' },
      { name: 'Charlotte Pudding', quantity: 4, cardNumber: 'ST07-008', type: 'CHARACTER', printingCode: 'ST07-008' },
      { name: 'Charlotte Mont-d\'or', quantity: 2, cardNumber: 'ST07-009', type: 'CHARACTER', printingCode: 'ST07-009' },
      { name: 'Charlotte Linlin', quantity: 2, cardNumber: 'ST07-010', type: 'CHARACTER', printingCode: 'ST07-010' },
      { name: 'Zeus', quantity: 4, cardNumber: 'ST07-011', type: 'CHARACTER', printingCode: 'ST07-011' },
      { name: 'Baron Tamago', quantity: 4, cardNumber: 'ST07-012', type: 'CHARACTER', printingCode: 'ST07-012' },
      { name: 'Prometheus', quantity: 4, cardNumber: 'ST07-013', type: 'CHARACTER', printingCode: 'ST07-013' },
      { name: 'Pekoms', quantity: 4, cardNumber: 'ST07-014', type: 'CHARACTER', printingCode: 'ST07-014' },
      { name: 'Soul Pocus', quantity: 4, cardNumber: 'ST07-015', type: 'EVENT', printingCode: 'ST07-015' },
      { name: 'Power Mochi', quantity: 2, cardNumber: 'ST07-016', type: 'EVENT', printingCode: 'ST07-016' },
      { name: 'Queen Mama Chanter', quantity: 2, cardNumber: 'ST07-017', type: 'STAGE', printingCode: 'ST07-017' },
    ]
  },
  {
    deckName: 'Monkey D. Luffy',
    deckCode: 'ST-08',
    cards: [
      { name: 'Monkey.D.Luffy', quantity: 1, cardNumber: 'ST08-001', type: 'LEADER', printingCode: 'ST08-001' },
      { name: 'Uta', quantity: 2, cardNumber: 'ST08-002', type: 'CHARACTER', printingCode: 'ST08-002' },
      { name: 'Gaimon', quantity: 4, cardNumber: 'ST08-003', type: 'CHARACTER', printingCode: 'ST08-003' },
      { name: 'Koby', quantity: 4, cardNumber: 'ST08-004', type: 'CHARACTER', printingCode: 'ST08-004' },
      { name: 'Shanks', quantity: 2, cardNumber: 'ST08-005', type: 'CHARACTER', printingCode: 'ST08-005' },
      { name: 'Shirahoshi', quantity: 4, cardNumber: 'ST08-006', type: 'CHARACTER', printingCode: 'ST08-006' },
      { name: 'Nefeltari Vivi', quantity: 4, cardNumber: 'ST08-007', type: 'CHARACTER', printingCode: 'ST08-007' },
      { name: 'Higuma', quantity: 4, cardNumber: 'ST08-008', type: 'CHARACTER', printingCode: 'ST08-008' },
      { name: 'Makino', quantity: 4, cardNumber: 'ST08-009', type: 'CHARACTER', printingCode: 'ST08-009' },
      { name: 'Monkey.D.Garp', quantity: 4, cardNumber: 'ST08-010', type: 'CHARACTER', printingCode: 'ST08-010' },
      { name: 'Monkey.D.Luffy', quantity: 4, cardNumber: 'ST08-011', type: 'CHARACTER', printingCode: 'ST08-011' },
      { name: 'Laboon', quantity: 4, cardNumber: 'ST08-012', type: 'CHARACTER', printingCode: 'ST08-012' },
      { name: 'Mr.2.Bon.Kurei(Bentham)', quantity: 4, cardNumber: 'ST08-013', type: 'CHARACTER', printingCode: 'ST08-013' },
      { name: 'Gum-Gum Bell', quantity: 4, cardNumber: 'ST08-014', type: 'EVENT', printingCode: 'ST08-014' },
      { name: 'Gum-Gum Pistol', quantity: 2, cardNumber: 'ST08-015', type: 'EVENT', printingCode: 'ST08-015' },
    ]
  },
  {
    deckName: 'Yamato',
    deckCode: 'ST-09',
    cards: [
      { name: 'Yamato', quantity: 1, cardNumber: 'ST09-001', type: 'LEADER', printingCode: 'ST09-001' },
      { name: 'Uzuki Tempura', quantity: 4, cardNumber: 'ST09-002', type: 'CHARACTER', printingCode: 'ST09-002' },
      { name: 'Ulti', quantity: 4, cardNumber: 'ST09-003', type: 'CHARACTER', printingCode: 'ST09-003' },
      { name: 'Kaido', quantity: 4, cardNumber: 'ST09-004', type: 'CHARACTER', printingCode: 'ST09-004' },
      { name: 'Kouzuki Oden', quantity: 2, cardNumber: 'ST09-005', type: 'CHARACTER', printingCode: 'ST09-005' },
      { name: 'Kouzuki Momonosuke', quantity: 4, cardNumber: 'ST09-006', type: 'CHARACTER', printingCode: 'ST09-006' },
      { name: 'Shinobu', quantity: 4, cardNumber: 'ST09-007', type: 'CHARACTER', printingCode: 'ST09-007' },
      { name: 'Shimotsuki Ushimaru', quantity: 4, cardNumber: 'ST09-008', type: 'CHARACTER', printingCode: 'ST09-008' },
      { name: 'Fugetsu Omusubi', quantity: 4, cardNumber: 'ST09-009', type: 'CHARACTER', printingCode: 'ST09-009' },
      { name: 'Portgas.D.Ace', quantity: 2, cardNumber: 'ST09-010', type: 'CHARACTER', printingCode: 'ST09-010' },
      { name: 'Monkey.D.Luffy', quantity: 4, cardNumber: 'ST09-011', type: 'CHARACTER', printingCode: 'ST09-011' },
      { name: 'Yamato', quantity: 4, cardNumber: 'ST09-012', type: 'CHARACTER', printingCode: 'ST09-012' },
      { name: 'Yamato', quantity: 4, cardNumber: 'ST09-013', type: 'CHARACTER', printingCode: 'ST09-013' },
      { name: 'Flèche sonore', quantity: 2, cardNumber: 'ST09-014', type: 'EVENT', printingCode: 'ST09-014' },
      { name: 'Thunder Bagua', quantity: 4, cardNumber: 'ST09-015', type: 'EVENT', printingCode: 'ST09-015' },
    ]
  },
  {
    deckName: 'The Three Captains',
    deckCode: 'ST-10',
    cards: [
      { name: 'Trafalgar Law', quantity: 1, cardNumber: 'ST10-001', type: 'LEADER', printingCode: 'ST10-001' },
      { name: 'Monkey.D.Luffy', quantity: 1, cardNumber: 'ST10-002', type: 'LEADER', printingCode: 'ST10-002' },
      { name: 'Eustass"Captain"Kid', quantity: 1, cardNumber: 'ST10-003', type: 'LEADER', printingCode: 'ST10-003' },
      { name: 'Sanji', quantity: 4, cardNumber: 'ST10-004', type: 'CHARACTER', printingCode: 'ST10-004' },
      { name: 'Jinbe', quantity: 2, cardNumber: 'ST10-005', type: 'CHARACTER', printingCode: 'ST10-005' },
      { name: 'Monkey.D.Luffy', quantity: 2, cardNumber: 'ST10-006', type: 'CHARACTER', printingCode: 'ST10-006' },
      { name: 'Killer', quantity: 4, cardNumber: 'ST10-007', type: 'CHARACTER', printingCode: 'ST10-007' },
      { name: 'Shachi et Pingouin', quantity: 4, cardNumber: 'ST10-008', type: 'CHARACTER', printingCode: 'ST10-008' },
      { name: 'Jean Bart', quantity: 4, cardNumber: 'ST10-009', type: 'CHARACTER', printingCode: 'ST10-009' },
      { name: 'Trafalgar Law', quantity: 2, cardNumber: 'ST10-010', type: 'CHARACTER', printingCode: 'ST10-010' },
      { name: 'Heat', quantity: 4, cardNumber: 'ST10-011', type: 'CHARACTER', printingCode: 'ST10-011' },
      { name: 'Bepo', quantity: 4, cardNumber: 'ST10-012', type: 'CHARACTER', printingCode: 'ST10-012' },
      { name: 'Eustass"Captain"Kid', quantity: 2, cardNumber: 'ST10-013', type: 'CHARACTER', printingCode: 'ST10-013' },
      { name: 'Wire', quantity: 4, cardNumber: 'ST10-014', type: 'CHARACTER', printingCode: 'ST10-014' },
      { name: 'Gum-Gum Giant Sumo Slap', quantity: 2, cardNumber: 'ST10-015', type: 'EVENT', printingCode: 'ST10-015' },
      { name: 'Gum-Gum Kong Gatling', quantity: 2, cardNumber: 'ST10-016', type: 'EVENT', printingCode: 'ST10-016' },
      { name: 'Punk Vise', quantity: 2, cardNumber: 'ST10-017', type: 'EVENT', printingCode: 'ST10-017' },
      { name: 'Nami', quantity: 4, cardNumber: 'OP01-016', type: 'CHARACTER', printingCode: 'OP01-016_p3' },
      { name: 'Roronoa Zoro', quantity: 4, cardNumber: 'OP01-025', type: 'CHARACTER', printingCode: 'OP01-025_p2' },
    ]
  },
  {
    deckName: 'Uta',
    deckCode: 'ST-11',
    cards: [
      { name: 'Uta', quantity: 1, cardNumber: 'ST11-001', type: 'LEADER', printingCode: 'ST11-001' },
      { name: 'Uta', quantity: 2, cardNumber: 'ST11-002', type: 'CHARACTER', printingCode: 'ST11-002' },
      { name: 'À contre-jour', quantity: 2, cardNumber: 'ST11-003', type: 'EVENT', printingCode: 'ST11-003' },
      { name: 'Nouvelle ère', quantity: 2, cardNumber: 'ST11-004', type: 'EVENT', printingCode: 'ST11-004' },
      { name: 'Je suis la plus forte', quantity: 4, cardNumber: 'ST11-005', type: 'EVENT', printingCode: 'ST11-005' },
      { name: 'Usopp', quantity: 4, cardNumber: 'OP02-028', type: 'CHARACTER', printingCode: 'OP02-028_p1' },
      { name: 'Jinbe', quantity: 4, cardNumber: 'OP02-033', type: 'CHARACTER', printingCode: 'OP02-033_p1' },
      { name: 'Tony Tony.Chopper', quantity: 4, cardNumber: 'OP02-034', type: 'CHARACTER', printingCode: 'OP02-034_p1' },
      { name: 'Trafalgar Law', quantity: 4, cardNumber: 'OP02-035', type: 'CHARACTER', printingCode: 'OP02-035_p2' },
      { name: 'Nico Robin', quantity: 4, cardNumber: 'OP02-037', type: 'CHARACTER', printingCode: 'OP02-037_p1' },
      { name: 'Franky', quantity: 4, cardNumber: 'OP02-039', type: 'CHARACTER', printingCode: 'OP02-039_p1' },
      { name: 'Brook', quantity: 4, cardNumber: 'OP02-040', type: 'CHARACTER', printingCode: 'OP02-040_p1' },
      { name: 'Monkey.D.Luffy', quantity: 4, cardNumber: 'OP02-041', type: 'CHARACTER', printingCode: 'OP02-041_p2' },
      { name: 'Roronoa Zoro', quantity: 4, cardNumber: 'OP02-043', type: 'CHARACTER', printingCode: 'OP02-043_p1' },
      { name: 'Three Sword Style Oni Giri', quantity: 4, cardNumber: 'OP02-045', type: 'EVENT', printingCode: 'OP02-045_p1' },
    ]
  },
  {
    deckName: 'Zoro and Sanji',
    deckCode: 'ST-12',
    cards: [
      { name: 'Roronoa Zoro & Sanji', quantity: 1, cardNumber: 'ST12-001', type: 'LEADER', printingCode: 'ST12-001' },
      { name: 'Kuina', quantity: 4, cardNumber: 'ST12-002', type: 'CHARACTER', printingCode: 'ST12-002' },
      { name: 'Dracule Mihawk', quantity: 2, cardNumber: 'ST12-003', type: 'CHARACTER', printingCode: 'ST12-003' },
      { name: 'Humandrill', quantity: 4, cardNumber: 'ST12-004', type: 'CHARACTER', printingCode: 'ST12-004' },
      { name: 'Perona', quantity: 4, cardNumber: 'ST12-005', type: 'CHARACTER', printingCode: 'ST12-005' },
      { name: 'Yosaku & Johnny', quantity: 4, cardNumber: 'ST12-006', type: 'CHARACTER', printingCode: 'ST12-006' },
      { name: 'Rika', quantity: 4, cardNumber: 'ST12-007', type: 'CHARACTER', printingCode: 'ST12-007' },
      { name: 'Roronoa Zoro', quantity: 2, cardNumber: 'ST12-008', type: 'CHARACTER', printingCode: 'ST12-008' },
      { name: 'Elephant True Bluefin', quantity: 4, cardNumber: 'ST12-009', type: 'CHARACTER', printingCode: 'ST12-009' },
      { name: 'Emporio.Ivankov', quantity: 2, cardNumber: 'ST12-010', type: 'CHARACTER', printingCode: 'ST12-010' },
      { name: 'Sanji', quantity: 2, cardNumber: 'ST12-011', type: 'CHARACTER', printingCode: 'ST12-011' },
      { name: 'Charlotte Pudding', quantity: 4, cardNumber: 'ST12-012', type: 'CHARACTER', printingCode: 'ST12-012' },
      { name: 'Zeff', quantity: 4, cardNumber: 'ST12-013', type: 'CHARACTER', printingCode: 'ST12-013' },
      { name: 'Duval', quantity: 2, cardNumber: 'ST12-014', type: 'CHARACTER', printingCode: 'ST12-014' },
      { name: 'Patty & Carne', quantity: 4, cardNumber: 'ST12-015', type: 'CHARACTER', printingCode: 'ST12-015' },
      { name: 'Lion Strike', quantity: 2, cardNumber: 'ST12-016', type: 'EVENT', printingCode: 'ST12-016' },
      { name: 'Parage Shoot', quantity: 2, cardNumber: 'ST12-017', type: 'EVENT', printingCode: 'ST12-017' },
    ]
  },
  {
    deckName: 'The Three Brothers',
    deckCode: 'ST-13',
    cards: [
      { name: 'Sabo', quantity: 1, cardNumber: 'ST13-001', type: 'LEADER', printingCode: 'ST13-001' },
      { name: 'Portgas D. Ace', quantity: 1, cardNumber: 'ST13-002', type: 'LEADER', printingCode: 'ST13-002' },
      { name: 'Monkey D. Luffy', quantity: 1, cardNumber: 'ST13-003', type: 'LEADER', printingCode: 'ST13-003' },
      { name: 'Edward Newgate', quantity: 4, cardNumber: 'ST13-004', type: 'CHARACTER', printingCode: 'ST13-004' },
      { name: 'Emporio.Ivankov', quantity: 2, cardNumber: 'ST13-005', type: 'CHARACTER', printingCode: 'ST13-005' },
      { name: 'Curly.Dadan', quantity: 4, cardNumber: 'ST13-006', type: 'CHARACTER', printingCode: 'ST13-006' },
      { name: 'Sabo', quantity: 4, cardNumber: 'ST13-007', type: 'CHARACTER', printingCode: 'ST13-007' },
      { name: 'Sabo', quantity: 2, cardNumber: 'ST13-008', type: 'CHARACTER', printingCode: 'ST13-008' },
      { name: 'Shanks', quantity: 4, cardNumber: 'ST13-009', type: 'CHARACTER', printingCode: 'ST13-009' },
      { name: 'Portgas D. Ace', quantity: 4, cardNumber: 'ST13-010', type: 'CHARACTER', printingCode: 'ST13-010' },
      { name: 'Portgas D. Ace', quantity: 2, cardNumber: 'ST13-011', type: 'CHARACTER', printingCode: 'ST13-011' },
      { name: 'Makino', quantity: 4, cardNumber: 'ST13-012', type: 'CHARACTER', printingCode: 'ST13-012' },
      { name: 'Monkey.D.Garp', quantity: 2, cardNumber: 'ST13-013', type: 'CHARACTER', printingCode: 'ST13-013' },
      { name: 'Monkey D. Luffy', quantity: 4, cardNumber: 'ST13-014', type: 'CHARACTER', printingCode: 'ST13-014' },
      { name: 'Monkey.D.Luffy', quantity: 2, cardNumber: 'ST13-015', type: 'CHARACTER', printingCode: 'ST13-015' },
      { name: 'Yamato', quantity: 4, cardNumber: 'ST13-016', type: 'CHARACTER', printingCode: 'ST13-016' },
      { name: 'Flame Dragon King', quantity: 2, cardNumber: 'ST13-017', type: 'EVENT', printingCode: 'ST13-017' },
      { name: 'Gum-Gum Jet Spear', quantity: 2, cardNumber: 'ST13-018', type: 'EVENT', printingCode: 'ST13-018' },
      { name: 'Le lien des trois frères', quantity: 4, cardNumber: 'ST13-019', type: 'EVENT', printingCode: 'ST13-019' },
    ]
  },
  {
    deckName: '3D2Y',
    deckCode: 'ST-14',
    cards: [
      { name: 'Monkey.D.Luffy', quantity: 1, cardNumber: 'ST14-001', type: 'LEADER', printingCode: 'ST14-001' },
      { name: 'Usopp', quantity: 4, cardNumber: 'ST14-002', type: 'CHARACTER', printingCode: 'ST14-002' },
      { name: 'Sanji', quantity: 2, cardNumber: 'ST14-003', type: 'CHARACTER', printingCode: 'ST14-003' },
      { name: 'Jinbe', quantity: 4, cardNumber: 'ST14-004', type: 'CHARACTER', printingCode: 'ST14-004' },
      { name: 'Tony Tony.Chopper', quantity: 4, cardNumber: 'ST14-005', type: 'CHARACTER', printingCode: 'ST14-005' },
      { name: 'Nami', quantity: 2, cardNumber: 'ST14-006', type: 'CHARACTER', printingCode: 'ST14-006' },
      { name: 'Nico Robin', quantity: 4, cardNumber: 'ST14-007', type: 'CHARACTER', printingCode: 'ST14-007' },
      { name: 'Haredas', quantity: 4, cardNumber: 'ST14-008', type: 'CHARACTER', printingCode: 'ST14-008' },
      { name: 'Franky', quantity: 4, cardNumber: 'ST14-009', type: 'CHARACTER', printingCode: 'ST14-009' },
      { name: 'Brook', quantity: 4, cardNumber: 'ST14-010', type: 'CHARACTER', printingCode: 'ST14-010' },
      { name: 'Heracles', quantity: 4, cardNumber: 'ST14-011', type: 'CHARACTER', printingCode: 'ST14-011' },
      { name: 'Monkey.D.Luffy', quantity: 2, cardNumber: 'ST14-012', type: 'CHARACTER', printingCode: 'ST14-012' },
      { name: 'Roronoa Zoro', quantity: 4, cardNumber: 'ST14-013', type: 'CHARACTER', printingCode: 'ST14-013' },
      { name: 'Gum-Gum Giant Rifle', quantity: 2, cardNumber: 'ST14-014', type: 'EVENT', printingCode: 'ST14-014' },
      { name: 'Gum-Gum Diable Three-Swords Style Mouten Jet Six Hundred Pound Phoenix Cannon', quantity: 2, cardNumber: 'ST14-015', type: 'EVENT', printingCode: 'ST14-015' },
      { name: 'Il me reste tous mes amis !!', quantity: 2, cardNumber: 'ST14-016', type: 'EVENT', printingCode: 'ST14-016' },
      { name: 'Thousand Sunny', quantity: 2, cardNumber: 'ST14-017', type: 'STAGE', printingCode: 'ST14-017' },
    ]
  },
  {
    deckName: 'Red Edward.Newgate',
    deckCode: 'ST-15',
    cards: [
      { name: 'Edward Newgate', quantity: 1, cardNumber: 'OP02-001', type: 'LEADER', printingCode: 'OP02-001_p1' },
      { name: 'Atmos', quantity: 4, cardNumber: 'ST15-001', type: 'CHARACTER', printingCode: 'ST15-001' },
      { name: 'Edward Newgate', quantity: 2, cardNumber: 'ST15-002', type: 'CHARACTER', printingCode: 'ST15-002' },
      { name: 'Kingdew', quantity: 4, cardNumber: 'ST15-003', type: 'CHARACTER', printingCode: 'ST15-003' },
      { name: 'Thatch', quantity: 2, cardNumber: 'ST15-004', type: 'CHARACTER', printingCode: 'ST15-004' },
      { name: 'Portgas D. Ace', quantity: 2, cardNumber: 'ST15-005', type: 'CHARACTER', printingCode: 'ST15-005' },
      { name: 'Joz', quantity: 4, cardNumber: 'OP02-008', type: 'CHARACTER', printingCode: 'OP02-008_p1' },
      { name: 'Marco', quantity: 4, cardNumber: 'OP02-018', type: 'CHARACTER', printingCode: 'OP02-018_p1' },
      { name: 'Rakuyo', quantity: 4, cardNumber: 'OP02-019', type: 'CHARACTER', printingCode: 'OP02-019_p1' },
      { name: 'Izo', quantity: 4, cardNumber: 'OP03-003', type: 'CHARACTER', printingCode: 'OP03-003_p1' },
      { name: 'Speed Jill', quantity: 4, cardNumber: 'OP03-006', type: 'CHARACTER', printingCode: 'OP03-006_p1' },
      { name: 'Namur', quantity: 4, cardNumber: 'OP03-007', type: 'CHARACTER', printingCode: 'OP03-007_p1' },
      { name: 'Haruta', quantity: 4, cardNumber: 'OP03-009', type: 'CHARACTER', printingCode: 'OP03-009_p1' },
      { name: 'Fossa', quantity: 4, cardNumber: 'OP03-010', type: 'CHARACTER', printingCode: 'OP03-010_p1' },
      { name: 'Tu as été stupide... mais je t\'aime quand même, mon fils', quantity: 4, cardNumber: 'OP02-023', type: 'EVENT', printingCode: 'OP02-023_p1' },
    ]
  },
  {
    deckName: 'Green Uta',
    deckCode: 'ST-16',
    cards: [
      { name: 'Uta', quantity: 1, cardNumber: 'ST11-001', type: 'LEADER', printingCode: 'ST11-001_p1' },
      { name: 'Uta', quantity: 2, cardNumber: 'ST16-001', type: 'CHARACTER', printingCode: 'ST16-001' },
      { name: 'Gordon', quantity: 4, cardNumber: 'ST16-002', type: 'CHARACTER', printingCode: 'ST16-002' },
      { name: 'Charlotte Katakuri', quantity: 4, cardNumber: 'ST16-003', type: 'CHARACTER', printingCode: 'ST16-003' },
      { name: 'Shanks', quantity: 2, cardNumber: 'ST16-004', type: 'CHARACTER', printingCode: 'ST16-004' },
      { name: 'Monkey D. Luffy', quantity: 2, cardNumber: 'ST16-005', type: 'CHARACTER', printingCode: 'ST16-005' },
      { name: 'Bartolomeo', quantity: 4, cardNumber: 'P-029', type: 'CHARACTER', printingCode: 'P-029_p1' },
      { name: 'Monkey D. Luffy', quantity: 4, cardNumber: 'P-061', type: 'CHARACTER', printingCode: 'P-061_p1' },
      { name: 'À contre-jour', quantity: 4, cardNumber: 'ST11-003', type: 'EVENT', printingCode: 'ST11-003_p1' },
      { name: 'Nouvelle ère', quantity: 4, cardNumber: 'ST11-004', type: 'EVENT', printingCode: 'ST11-004_p1' },
      { name: 'Je suis la plus forte', quantity: 4, cardNumber: 'ST11-005', type: 'EVENT', printingCode: 'ST11-005_p1' },
      { name: 'Berceuse éphémère', quantity: 4, cardNumber: 'P-057', type: 'EVENT', printingCode: 'P-057_p1' },
      { name: 'Où souffle le vent', quantity: 4, cardNumber: 'P-058', type: 'EVENT', printingCode: 'P-058_p1' },
      { name: 'Le monde continue', quantity: 4, cardNumber: 'P-059', type: 'EVENT', printingCode: 'P-059_p1' },
      { name: 'Tot Musica', quantity: 4, cardNumber: 'P-060', type: 'EVENT', printingCode: 'P-060_p1' },
    ]
  },
  {
    deckName: 'Blue Donquixote Doflamingo',
    deckCode: 'ST-17',
    cards: [
      { name: 'Don Quijote Doflamingo', quantity: 1, cardNumber: 'OP01-060', type: 'LEADER', printingCode: 'OP01-060_p1' },
      { name: 'Crocodile', quantity: 4, cardNumber: 'ST17-001', type: 'CHARACTER', printingCode: 'ST17-001' },
      { name: 'Trafalgar Law', quantity: 2, cardNumber: 'ST17-002', type: 'CHARACTER', printingCode: 'ST17-002' },
      { name: 'Baggy', quantity: 2, cardNumber: 'ST17-003', type: 'CHARACTER', printingCode: 'ST17-003' },
      { name: 'Boa Hancock', quantity: 2, cardNumber: 'ST17-004', type: 'CHARACTER', printingCode: 'ST17-004' },
      { name: 'Marshall D. Teach', quantity: 4, cardNumber: 'ST17-005', type: 'CHARACTER', printingCode: 'ST17-005' },
      { name: 'Don Quijote Doflamingo', quantity: 4, cardNumber: 'OP01-073', type: 'CHARACTER', printingCode: 'OP01-073_p1' },
      { name: 'Gecko Moria', quantity: 4, cardNumber: 'OP02-054', type: 'CHARACTER', printingCode: 'OP02-054_p1' },
      { name: 'Bartholomew Kuma', quantity: 4, cardNumber: 'OP02-057', type: 'CHARACTER', printingCode: 'OP02-057_p1' },
      { name: 'Edward Weeble', quantity: 4, cardNumber: 'ST03-002', type: 'CHARACTER', printingCode: 'ST03-002_p1' },
      { name: 'Gecko Moria', quantity: 4, cardNumber: 'ST03-004', type: 'CHARACTER', printingCode: 'ST03-004_p1' },
      { name: 'Dracule Mihawk', quantity: 4, cardNumber: 'ST03-005', type: 'CHARACTER', printingCode: 'ST03-005_p1' },
      { name: 'Trafalgar Law', quantity: 4, cardNumber: 'ST03-008', type: 'CHARACTER', printingCode: 'ST03-008_p1' },
      { name: 'Jinbe', quantity: 4, cardNumber: 'P-030', type: 'CHARACTER', printingCode: 'P-030_p1' },
      { name: 'Overheat', quantity: 4, cardNumber: 'OP01-086', type: 'EVENT', printingCode: 'OP01-086_p1' },
    ]
  },
  {
    deckName: 'Purple Monkey.D.Luffy',
    deckCode: 'ST-18',
    cards: [
      { name: 'Monkey D. Luffy', quantity: 1, cardNumber: 'OP05-060', type: 'LEADER', printingCode: 'OP05-060_p1' },
      { name: 'Usohachi', quantity: 2, cardNumber: 'ST18-001', type: 'CHARACTER', printingCode: 'ST18-001' },
      { name: 'O-Nami', quantity: 4, cardNumber: 'ST18-002', type: 'CHARACTER', printingCode: 'ST18-002' },
      { name: 'Sangoro', quantity: 4, cardNumber: 'ST18-003', type: 'CHARACTER', printingCode: 'ST18-003' },
      { name: 'Zorojuro', quantity: 2, cardNumber: 'ST18-004', type: 'CHARACTER', printingCode: 'ST18-004' },
      { name: 'Luffytaro', quantity: 2, cardNumber: 'ST18-005', type: 'CHARACTER', printingCode: 'ST18-005' },
      { name: 'Usohachi', quantity: 4, cardNumber: 'OP05-061', type: 'CHARACTER', printingCode: 'OP05-061_p1' },
      { name: 'O-Robi', quantity: 4, cardNumber: 'OP05-063', type: 'CHARACTER', printingCode: 'OP05-063_p1' },
      { name: 'Jinbe', quantity: 4, cardNumber: 'OP05-066', type: 'CHARACTER', printingCode: 'OP05-066_p1' },
      { name: 'Zorojuro', quantity: 4, cardNumber: 'OP05-067', type: 'CHARACTER', printingCode: 'OP05-067_p2' },
      { name: 'Choppaemon', quantity: 4, cardNumber: 'OP05-068', type: 'CHARACTER', printingCode: 'OP05-068_p1' },
      { name: 'Fransuké', quantity: 4, cardNumber: 'OP05-070', type: 'CHARACTER', printingCode: 'OP05-070_p1' },
      { name: 'Brookichi', quantity: 4, cardNumber: 'OP05-072', type: 'CHARACTER', printingCode: 'OP05-072_p1' },
      { name: 'Monkey D. Luffy', quantity: 4, cardNumber: 'P-041', type: 'CHARACTER', printingCode: 'P-041_p1' },
      { name: 'En mer... ce sont les pirates qu\'on affronte !!', quantity: 4, cardNumber: 'OP05-076', type: 'EVENT', printingCode: 'OP05-076_p1' },
    ]
  },
  {
    deckName: 'Black Smoker',
    deckCode: 'ST-19',
    cards: [
      { name: 'Smoker', quantity: 1, cardNumber: 'OP02-093', type: 'LEADER', printingCode: 'OP02-093_p1' },
      { name: 'Smoker', quantity: 4, cardNumber: 'ST19-001', type: 'CHARACTER', printingCode: 'ST19-001' },
      { name: 'Sengoku', quantity: 2, cardNumber: 'ST19-002', type: 'CHARACTER', printingCode: 'ST19-002' },
      { name: 'Tashigi', quantity: 2, cardNumber: 'ST19-003', type: 'CHARACTER', printingCode: 'ST19-003' },
      { name: 'Hina', quantity: 2, cardNumber: 'ST19-004', type: 'CHARACTER', printingCode: 'ST19-004' },
      { name: 'Monkey D. Garp', quantity: 4, cardNumber: 'ST19-005', type: 'CHARACTER', printingCode: 'ST19-005' },
      { name: 'Kobby', quantity: 4, cardNumber: 'OP02-098', type: 'CHARACTER', printingCode: 'OP02-098_p1' },
      { name: 'Tsuru', quantity: 4, cardNumber: 'OP02-106', type: 'CHARACTER', printingCode: 'OP02-106_p1' },
      { name: 'Don Quijote Rosinante', quantity: 4, cardNumber: 'OP02-108', type: 'CHARACTER', printingCode: 'OP02-108_p1' },
      { name: 'Haguar D. Sauro', quantity: 4, cardNumber: 'OP02-109', type: 'CHARACTER', printingCode: 'OP02-109_p1' },
      { name: 'Hermep', quantity: 4, cardNumber: 'OP02-113', type: 'CHARACTER', printingCode: 'OP02-113_p1' },
      { name: 'Yamakaji', quantity: 4, cardNumber: 'OP02-116', type: 'CHARACTER', printingCode: 'OP02-116_p1' },
      { name: 'Vergo', quantity: 4, cardNumber: 'OP03-079', type: 'CHARACTER', printingCode: 'OP03-079_p1' },
      { name: 'Brandnew', quantity: 4, cardNumber: 'OP03-089', type: 'CHARACTER', printingCode: 'OP03-089_p1' },
      { name: 'Ice Age', quantity: 4, cardNumber: 'OP02-117', type: 'EVENT', printingCode: 'OP02-117_p1' },
    ]
  },
  {
    deckName: 'Yellow Charlotte Katakuri',
    deckCode: 'ST-20',
    cards: [
      { name: 'Charlotte Katakuri', quantity: 1, cardNumber: 'OP03-099', type: 'LEADER', printingCode: 'OP03-099_p1' },
      { name: 'Charlotte Katakuri', quantity: 2, cardNumber: 'ST20-001', type: 'CHARACTER', printingCode: 'ST20-001' },
      { name: 'Charlotte Cracker', quantity: 4, cardNumber: 'ST20-002', type: 'CHARACTER', printingCode: 'ST20-002' },
      { name: 'Charlotte Brûlée', quantity: 4, cardNumber: 'ST20-003', type: 'CHARACTER', printingCode: 'ST20-003' },
      { name: 'Charlotte Pudding', quantity: 2, cardNumber: 'ST20-004', type: 'CHARACTER', printingCode: 'ST20-004' },
      { name: 'Charlotte Linlin', quantity: 2, cardNumber: 'ST20-005', type: 'CHARACTER', printingCode: 'ST20-005' },
      { name: 'Charlotte Opéra', quantity: 4, cardNumber: 'OP03-106', type: 'CHARACTER', printingCode: 'OP03-106_p1' },
      { name: 'Charlotte Galette', quantity: 4, cardNumber: 'OP03-107', type: 'CHARACTER', printingCode: 'OP03-107_p1' },
      { name: 'Charlotte Smoothie', quantity: 4, cardNumber: 'OP03-110', type: 'CHARACTER', printingCode: 'OP03-110_p1' },
      { name: 'Charlotte Pudding', quantity: 4, cardNumber: 'OP03-112', type: 'CHARACTER', printingCode: 'OP03-112_p1' },
      { name: 'Streusen', quantity: 4, cardNumber: 'OP03-115', type: 'CHARACTER', printingCode: 'OP03-115_p1' },
      { name: 'Charlotte Daifuku', quantity: 4, cardNumber: 'ST07-005', type: 'CHARACTER', printingCode: 'ST07-005_p1' },
      { name: 'Pekoms', quantity: 4, cardNumber: 'ST07-014', type: 'CHARACTER', printingCode: 'ST07-014_p1' },
      { name: 'Térébration', quantity: 4, cardNumber: 'OP03-118', type: 'EVENT', printingCode: 'OP03-118_p1' },
      { name: 'Colonne foudroyante', quantity: 4, cardNumber: 'OP03-121', type: 'EVENT', printingCode: 'OP03-121_p1' },
    ]
  },
  {
    deckName: 'GEAR5',
    deckCode: 'ST-21',
    cards: [
      { name: 'Monkey D. Luffy', quantity: 1, cardNumber: 'ST21-001', type: 'LEADER', printingCode: 'ST21-001' },
      { name: 'Usopp', quantity: 2, cardNumber: 'ST21-002', type: 'CHARACTER', printingCode: 'ST21-002' },
      { name: 'Sanji', quantity: 2, cardNumber: 'ST21-003', type: 'CHARACTER', printingCode: 'ST21-003' },
      { name: 'Jewelry Bonney', quantity: 4, cardNumber: 'ST21-004', type: 'CHARACTER', printingCode: 'ST21-004' },
      { name: 'Jinbe', quantity: 4, cardNumber: 'ST21-005', type: 'CHARACTER', printingCode: 'ST21-005' },
      { name: 'Stussy', quantity: 4, cardNumber: 'ST21-006', type: 'CHARACTER', printingCode: 'ST21-006' },
      { name: 'Sentomaru', quantity: 4, cardNumber: 'ST21-007', type: 'CHARACTER', printingCode: 'ST21-007' },
      { name: 'Tony-Tony Chopper', quantity: 4, cardNumber: 'ST21-008', type: 'CHARACTER', printingCode: 'ST21-008' },
      { name: 'Nami', quantity: 4, cardNumber: 'ST21-009', type: 'CHARACTER', printingCode: 'ST21-009' },
      { name: 'Nico Robin', quantity: 2, cardNumber: 'ST21-010', type: 'CHARACTER', printingCode: 'ST21-010' },
      { name: 'Franky', quantity: 4, cardNumber: 'ST21-011', type: 'CHARACTER', printingCode: 'ST21-011' },
      { name: 'Brook', quantity: 4, cardNumber: 'ST21-012', type: 'CHARACTER', printingCode: 'ST21-012' },
      { name: 'Végapunk', quantity: 4, cardNumber: 'ST21-013', type: 'CHARACTER', printingCode: 'ST21-013' },
      { name: 'Monkey D. Luffy', quantity: 2, cardNumber: 'ST21-014', type: 'CHARACTER', printingCode: 'ST21-014' },
      { name: 'Roronoa Zoro', quantity: 2, cardNumber: 'ST21-015', type: 'CHARACTER', printingCode: 'ST21-015' },
      { name: 'Gum Gum Dawn Whip', quantity: 2, cardNumber: 'ST21-016', type: 'EVENT', printingCode: 'ST21-016' },
      { name: 'Gum Gum Taupe Bullet', quantity: 2, cardNumber: 'ST21-017', type: 'EVENT', printingCode: 'ST21-017' },
    ]
  },
  {
    deckName: 'Ace & Newgate',
    deckCode: 'ST-22',
    cards: [
      { name: 'Ace et Newgate', quantity: 1, cardNumber: 'ST22-001', type: 'LEADER', printingCode: 'ST22-001' },
      { name: 'Izo', quantity: 2, cardNumber: 'ST22-002', type: 'CHARACTER', printingCode: 'ST22-002' },
      { name: 'Edward Newgate', quantity: 4, cardNumber: 'ST22-003', type: 'CHARACTER', printingCode: 'ST22-003' },
      { name: 'Elmy', quantity: 4, cardNumber: 'ST22-004', type: 'CHARACTER', printingCode: 'ST22-004' },
      { name: 'Oden Kozuki', quantity: 2, cardNumber: 'ST22-005', type: 'CHARACTER', printingCode: 'ST22-005' },
      { name: 'Joz', quantity: 4, cardNumber: 'ST22-006', type: 'CHARACTER', printingCode: 'ST22-006' },
      { name: 'Squardo', quantity: 2, cardNumber: 'ST22-007', type: 'CHARACTER', printingCode: 'ST22-007' },
      { name: 'Les frères Decalvan', quantity: 4, cardNumber: 'ST22-008', type: 'CHARACTER', printingCode: 'ST22-008' },
      { name: 'Vista', quantity: 4, cardNumber: 'ST22-009', type: 'CHARACTER', printingCode: 'ST22-009' },
      { name: 'Portgas D. Ace', quantity: 2, cardNumber: 'ST22-010', type: 'CHARACTER', printingCode: 'ST22-010' },
      { name: 'Whitey Bay', quantity: 2, cardNumber: 'ST22-011', type: 'CHARACTER', printingCode: 'ST22-011' },
      { name: 'Marco', quantity: 4, cardNumber: 'ST22-012', type: 'CHARACTER', printingCode: 'ST22-012' },
      { name: 'Little Oz Junior', quantity: 4, cardNumber: 'ST22-013', type: 'CHARACTER', printingCode: 'ST22-013' },
      { name: 'A.O', quantity: 4, cardNumber: 'ST22-014', type: 'CHARACTER', printingCode: 'ST22-014' },
      { name: 'Je suis "Barbe Blanche" !!', quantity: 4, cardNumber: 'ST22-015', type: 'EVENT', printingCode: 'ST22-015' },
      { name: 'Retire immédiatement... ce que tu viens de dire !!', quantity: 2, cardNumber: 'ST22-016', type: 'EVENT', printingCode: 'ST22-016' },
      { name: 'Poing ardent', quantity: 2, cardNumber: 'ST22-017', type: 'EVENT', printingCode: 'ST22-017' },
    ]
  },
  {
    deckName: 'RED Shanks',
    deckCode: 'ST-23',
    cards: [
      { name: 'Shanks', quantity: 1, cardNumber: 'OP09-001', type: 'LEADER', printingCode: 'OP09-001_p2' },
      { name: 'Uta', quantity: 2, cardNumber: 'ST23-001', type: 'CHARACTER', printingCode: 'ST23-001' },
      { name: 'Shanks', quantity: 2, cardNumber: 'ST23-002', type: 'CHARACTER', printingCode: 'ST23-002' },
      { name: 'Ben Beckmann', quantity: 2, cardNumber: 'ST23-003', type: 'CHARACTER', printingCode: 'ST23-003' },
      { name: 'Monkey D. Luffy', quantity: 4, cardNumber: 'ST23-004', type: 'CHARACTER', printingCode: 'ST23-004' },
      { name: 'Yasopp', quantity: 4, cardNumber: 'ST23-005', type: 'CHARACTER', printingCode: 'ST23-005' },
      { name: 'Howling Gab', quantity: 4, cardNumber: 'OP09-006', type: 'CHARACTER', printingCode: 'OP09-006_r1' },
      { name: 'Bonk Punch', quantity: 4, cardNumber: 'OP09-010', type: 'CHARACTER', printingCode: 'OP09-010_r1' },
      { name: 'Hongo', quantity: 4, cardNumber: 'OP09-011', type: 'CHARACTER', printingCode: 'OP09-011_r1' },
      { name: 'Monster', quantity: 4, cardNumber: 'OP09-012', type: 'CHARACTER', printingCode: 'OP09-012_r1' },
      { name: 'Yasopp', quantity: 4, cardNumber: 'OP09-013', type: 'CHARACTER', printingCode: 'OP09-013_r1' },
      { name: 'Limejuice', quantity: 4, cardNumber: 'OP09-014', type: 'CHARACTER', printingCode: 'OP09-014_r1' },
      { name: 'Lucky Roo', quantity: 4, cardNumber: 'OP09-015', type: 'CHARACTER', printingCode: 'OP09-015_r1' },
      { name: 'Rockstar', quantity: 4, cardNumber: 'OP09-016', type: 'CHARACTER', printingCode: 'OP09-016_r1' },
      { name: 'Qu\'ils viennent !! On les attend de pied ferme !!', quantity: 4, cardNumber: 'OP09-020', type: 'EVENT', printingCode: 'OP09-020_p1' },
    ]
  },
  {
    deckName: 'GREEN Jewelry Bonney',
    deckCode: 'ST-24',
    cards: [
      { name: 'Jewelry Bonney', quantity: 1, cardNumber: 'OP07-019', type: 'LEADER', printingCode: 'OP07-019_p2' },
      { name: 'Capone "Gang" Bege', quantity: 4, cardNumber: 'ST24-001', type: 'CHARACTER', printingCode: 'ST24-001' },
      { name: 'Kidd et Killer', quantity: 2, cardNumber: 'ST24-002', type: 'CHARACTER', printingCode: 'ST24-002' },
      { name: 'Basil Hawkins', quantity: 2, cardNumber: 'ST24-003', type: 'CHARACTER', printingCode: 'ST24-003' },
      { name: 'Law et Bepo', quantity: 2, cardNumber: 'ST24-004', type: 'CHARACTER', printingCode: 'ST24-004' },
      { name: 'X-Drake', quantity: 4, cardNumber: 'ST24-005', type: 'CHARACTER', printingCode: 'ST24-005' },
      { name: 'Scratchmen Apoo', quantity: 4, cardNumber: 'EB01-015', type: 'CHARACTER', printingCode: 'EB01-015_p3' },
      { name: 'Urouge', quantity: 4, cardNumber: 'OP07-021', type: 'CHARACTER', printingCode: 'OP07-021_p2' },
      { name: 'Caribou', quantity: 4, cardNumber: 'OP07-023', type: 'CHARACTER', printingCode: 'OP07-023_p1' },
      { name: 'Coribou', quantity: 4, cardNumber: 'OP07-025', type: 'CHARACTER', printingCode: 'OP07-025_p1' },
      { name: 'Bartolomeo', quantity: 4, cardNumber: 'OP07-031', type: 'CHARACTER', printingCode: 'OP07-031_p1' },
      { name: 'Monkey D. Luffy', quantity: 4, cardNumber: 'OP07-033', type: 'CHARACTER', printingCode: 'OP07-033_p1' },
      { name: 'Roronoa Zoro', quantity: 4, cardNumber: 'OP07-034', type: 'CHARACTER', printingCode: 'OP07-034_p1' },
      { name: 'Esprit démoniaque, technique à neuf sabres, Ashura, neuf éclairs démoniaques', quantity: 4, cardNumber: 'OP07-036', type: 'EVENT', printingCode: 'OP07-036_p1' },
      { name: 'Apportez-moi des pizzas !!', quantity: 4, cardNumber: 'OP07-037', type: 'EVENT', printingCode: 'OP07-037_p1' },
    ]
  },
  {
    deckName: 'BLUE Buggy',
    deckCode: 'ST-25',
    cards: [
      { name: 'Baggy', quantity: 1, cardNumber: 'OP09-042', type: 'LEADER', printingCode: 'OP09-042_p2' },
      { name: 'Alvida', quantity: 2, cardNumber: 'ST25-001', type: 'CHARACTER', printingCode: 'ST25-001' },
      { name: 'Cabaji', quantity: 4, cardNumber: 'ST25-002', type: 'CHARACTER', printingCode: 'ST25-002' },
      { name: 'Crocodile et Mihawk', quantity: 2, cardNumber: 'ST25-003', type: 'CHARACTER', printingCode: 'ST25-003' },
      { name: 'Baggy', quantity: 2, cardNumber: 'ST25-004', type: 'CHARACTER', printingCode: 'ST25-004' },
      { name: 'Morge', quantity: 4, cardNumber: 'ST25-005', type: 'CHARACTER', printingCode: 'ST25-005' },
      { name: 'Alvida', quantity: 4, cardNumber: 'OP09-043', type: 'CHARACTER', printingCode: 'OP09-043_r1' },
      { name: 'Cabaji', quantity: 4, cardNumber: 'OP09-045', type: 'CHARACTER', printingCode: 'OP09-045_r1' },
      { name: 'Baggy', quantity: 4, cardNumber: 'OP09-051', type: 'CHARACTER', printingCode: 'OP09-051_r1' },
      { name: 'Morge', quantity: 4, cardNumber: 'OP09-053', type: 'CHARACTER', printingCode: 'OP09-053_r1' },
      { name: 'Richie', quantity: 4, cardNumber: 'OP09-054', type: 'CHARACTER', printingCode: 'OP09-054_r1' },
      { name: 'Mr 1 (Das Bones)', quantity: 4, cardNumber: 'OP09-055', type: 'CHARACTER', printingCode: 'OP09-055_r1' },
      { name: 'Mr 3 (Galdino)', quantity: 4, cardNumber: 'OP09-056', type: 'CHARACTER', printingCode: 'OP09-056_r1' },
      { name: 'Baggy', quantity: 4, cardNumber: 'P-084', type: 'CHARACTER', printingCode: 'P-084' },
      { name: 'Cross Guild', quantity: 4, cardNumber: 'OP09-057', type: 'EVENT', printingCode: 'OP09-057_p1' },
    ]
  },
  {
    deckName: 'PURPLE/BLACK Monkey.D.Luffy',
    deckCode: 'ST-26',
    cards: [
      { name: 'Monkey D. Luffy', quantity: 1, cardNumber: 'OP09-061', type: 'LEADER', printingCode: 'OP09-061_p2' },
      { name: 'O-Soba Mask', quantity: 4, cardNumber: 'ST26-001', type: 'CHARACTER', printingCode: 'ST26-001' },
      { name: 'Tony-Tony Chopper', quantity: 2, cardNumber: 'ST26-002', type: 'CHARACTER', printingCode: 'ST26-002' },
      { name: 'Nico Robin', quantity: 2, cardNumber: 'ST26-003', type: 'CHARACTER', printingCode: 'ST26-003' },
      { name: 'Général Franky', quantity: 4, cardNumber: 'ST26-004', type: 'CHARACTER', printingCode: 'ST26-004' },
      { name: 'Monkey D. Luffy', quantity: 2, cardNumber: 'ST26-005', type: 'CHARACTER', printingCode: 'ST26-005' },
      { name: 'Sangoro', quantity: 4, cardNumber: 'OP05-065', type: 'CHARACTER', printingCode: 'OP05-065' },
      { name: 'Jinbe', quantity: 4, cardNumber: 'OP05-066', type: 'CHARACTER', printingCode: 'OP05-066_r1' },
      { name: 'Fransuké', quantity: 4, cardNumber: 'OP05-070', type: 'CHARACTER', printingCode: 'OP05-070_r1' },
      { name: 'Usopp', quantity: 4, cardNumber: 'OP09-063', type: 'CHARACTER', printingCode: 'OP09-063_r1' },
      { name: 'Nami', quantity: 4, cardNumber: 'OP09-070', type: 'CHARACTER', printingCode: 'OP09-070_r1' },
      { name: 'Roronoa Zoro', quantity: 4, cardNumber: 'OP09-076', type: 'CHARACTER', printingCode: 'OP09-076_r1' },
      { name: 'Brook', quantity: 4, cardNumber: 'ST14-010', type: 'CHARACTER', printingCode: 'ST14-010' },
      { name: 'Gum Gum Foudre', quantity: 4, cardNumber: 'OP09-077', type: 'EVENT', printingCode: 'OP09-077_r1' },
      { name: 'Gum Gum Gigant', quantity: 4, cardNumber: 'OP09-078', type: 'EVENT', printingCode: 'OP09-078_p1' },
    ]
  },
  {
    deckName: 'BLACK Marshall.D.Teach',
    deckCode: 'ST-27',
    cards: [
      { name: 'Marshall D. Teach', quantity: 1, cardNumber: 'OP09-081', type: 'LEADER', printingCode: 'OP09-081_p2' },
      { name: 'Avalo Pizarro', quantity: 4, cardNumber: 'ST27-001', type: 'CHARACTER', printingCode: 'ST27-001' },
      { name: 'Catarina Devon', quantity: 4, cardNumber: 'ST27-002', type: 'CHARACTER', printingCode: 'ST27-002' },
      { name: 'Kuzan', quantity: 2, cardNumber: 'ST27-003', type: 'CHARACTER', printingCode: 'ST27-003' },
      { name: 'Sanjuan Wolf', quantity: 2, cardNumber: 'ST27-004', type: 'CHARACTER', printingCode: 'ST27-004' },
      { name: 'Marshall D. Teach', quantity: 2, cardNumber: 'ST27-005', type: 'CHARACTER', printingCode: 'ST27-005' },
      { name: 'Van Auger', quantity: 4, cardNumber: 'OP09-083', type: 'CHARACTER', printingCode: 'OP09-083_r1' },
      { name: 'Sanjuan Wolf', quantity: 4, cardNumber: 'OP10-084', type: 'CHARACTER', printingCode: 'OP10-084_r1' },
      { name: 'Jesus Burgess', quantity: 4, cardNumber: 'OP09-086', type: 'CHARACTER', printingCode: 'OP09-086_r1' },
      { name: 'Shiliew', quantity: 4, cardNumber: 'OP09-088', type: 'CHARACTER', printingCode: 'OP09-088_r1' },
      { name: 'Stronger', quantity: 4, cardNumber: 'OP09-089', type: 'CHARACTER', printingCode: 'OP09-089_r1' },
      { name: 'Doc Q', quantity: 4, cardNumber: 'OP09-090', type: 'CHARACTER', printingCode: 'OP09-090_r1' },
      { name: 'Vasco Shot', quantity: 4, cardNumber: 'OP09-091', type: 'CHARACTER', printingCode: 'OP09-091_r1' },
      { name: 'Laffitte', quantity: 4, cardNumber: 'OP09-095', type: 'CHARACTER', printingCode: 'OP09-095_r1' },
      { name: 'Ruche', quantity: 4, cardNumber: 'OP09-099', type: 'STAGE', printingCode: 'OP09-099_r1' },
    ]
  },
  {
    deckName: 'GREEN/YELLOW Yamato',
    deckCode: 'ST-28',
    cards: [
      { name: 'Yamato', quantity: 1, cardNumber: 'OP06-022', type: 'LEADER', printingCode: 'OP06-022_p2' },
      { name: 'Ashura Doji', quantity: 4, cardNumber: 'ST28-001', type: 'CHARACTER', printingCode: 'ST28-001' },
      { name: 'Izo', quantity: 4, cardNumber: 'ST28-002', type: 'CHARACTER', printingCode: 'ST28-002' },
      { name: 'Kinémon', quantity: 2, cardNumber: 'ST28-003', type: 'CHARACTER', printingCode: 'ST28-003' },
      { name: 'Momonosuké Kozuki', quantity: 2, cardNumber: 'ST28-004', type: 'CHARACTER', printingCode: 'ST28-004' },
      { name: 'Yamato', quantity: 2, cardNumber: 'ST28-005', type: 'CHARACTER', printingCode: 'ST28-005' },
      { name: 'Caborage', quantity: 4, cardNumber: 'OP06-100', type: 'CHARACTER', printingCode: 'OP06-100_r1' },
      { name: 'Kawamatsu', quantity: 4, cardNumber: 'OP06-103', type: 'CHARACTER', printingCode: 'OP06-103_p1' },
      { name: 'Kikunojo', quantity: 4, cardNumber: 'OP06-104', type: 'CHARACTER', printingCode: 'OP06-104_p1' },
      { name: 'Denjiro', quantity: 4, cardNumber: 'OP06-109', type: 'CHARACTER', printingCode: 'OP06-109_p1' },
      { name: 'Chavipère', quantity: 4, cardNumber: 'OP06-110', type: 'CHARACTER', printingCode: 'OP06-110_r1' },
      { name: 'Raizo', quantity: 4, cardNumber: 'OP06-112', type: 'CHARACTER', printingCode: 'OP06-112_p1' },
      { name: 'Portgas D. Ace', quantity: 4, cardNumber: 'OP09-035', type: 'CHARACTER', printingCode: 'OP09-035_r1' },
      { name: 'Yamato', quantity: 4, cardNumber: 'ST13-016', type: 'CHARACTER', printingCode: 'ST13-016_p1' },
      { name: 'Brise-flammes', quantity: 4, cardNumber: 'OP07-116', type: 'EVENT', printingCode: 'OP07-116_p1' },
    ]
  },
  {
    deckName: 'Egghead',
    deckCode: 'ST-29',
    cards: [
      { name: 'Monkey D. Luffy', quantity: 1, cardNumber: 'ST29-001', type: 'LEADER', printingCode: 'ST29-001' },
      { name: 'Usopp', quantity: 4, cardNumber: 'ST29-002', type: 'CHARACTER', printingCode: 'ST29-002' },
      { name: 'Kaku', quantity: 4, cardNumber: 'ST29-003', type: 'CHARACTER', printingCode: 'ST29-003' },
      { name: 'Sanji', quantity: 2, cardNumber: 'ST29-004', type: 'CHARACTER', printingCode: 'ST29-004' },
      { name: 'Jinbe', quantity: 2, cardNumber: 'ST29-005', type: 'CHARACTER', printingCode: 'ST29-005' },
      { name: 'Stussy', quantity: 4, cardNumber: 'ST29-006', type: 'CHARACTER', printingCode: 'ST29-006' },
      { name: 'Tony-Tony Chopper', quantity: 2, cardNumber: 'ST29-007', type: 'CHARACTER', printingCode: 'ST29-007' },
      { name: 'Nami', quantity: 2, cardNumber: 'ST29-008', type: 'CHARACTER', printingCode: 'ST29-008' },
      { name: 'Nico Robin', quantity: 2, cardNumber: 'ST29-009', type: 'CHARACTER', printingCode: 'ST29-009' },
      { name: 'Franky', quantity: 4, cardNumber: 'ST29-010', type: 'CHARACTER', printingCode: 'ST29-010' },
      { name: 'Brook', quantity: 4, cardNumber: 'ST29-011', type: 'CHARACTER', printingCode: 'ST29-011' },
      { name: 'Monkey D. Luffy', quantity: 4, cardNumber: 'ST29-012', type: 'CHARACTER', printingCode: 'ST29-012' },
      { name: 'Rob Lucci', quantity: 4, cardNumber: 'ST29-013', type: 'CHARACTER', printingCode: 'ST29-013' },
      { name: 'Roronoa Zoro', quantity: 2, cardNumber: 'ST29-014', type: 'CHARACTER', printingCode: 'ST29-014' },
      { name: 'Saignant Strike', quantity: 4, cardNumber: 'ST29-015', type: 'EVENT', printingCode: 'ST29-015' },
      { name: 'Kizaru ! Mon équipage et moi on est cent fois plus forts qu\'il y a deux ans !', quantity: 2, cardNumber: 'ST29-016', type: 'EVENT', printingCode: 'ST29-016' },
      { name: 'Iai, le chant funèbre du lion', quantity: 4, cardNumber: 'ST29-017', type: 'EVENT', printingCode: 'ST29-017' },
    ]
  },
  {
    deckName: 'Luffy & Ace',
    deckCode: 'ST-30',
    cards: [
      { name: 'Luffy et Ace', quantity: 1, cardNumber: 'ST30-001', type: 'LEADER', printingCode: 'ST30-001' },
      { name: 'Inazuma', quantity: 2, cardNumber: 'ST30-002', type: 'CHARACTER', printingCode: 'ST30-002' },
      { name: 'Edward Newgate', quantity: 4, cardNumber: 'ST30-003', type: 'CHARACTER', printingCode: 'ST30-003' },
      { name: 'Emporio Ivankov', quantity: 2, cardNumber: 'ST30-004', type: 'CHARACTER', printingCode: 'ST30-004' },
      { name: 'Joz', quantity: 4, cardNumber: 'ST30-005', type: 'CHARACTER', printingCode: 'ST30-005' },
      { name: 'Jinbe', quantity: 4, cardNumber: 'ST30-006', type: 'CHARACTER', printingCode: 'ST30-006' },
      { name: 'Portgas D. Ace', quantity: 2, cardNumber: 'ST30-007', type: 'CHARACTER', printingCode: 'ST30-007' },
      { name: 'Marco', quantity: 4, cardNumber: 'ST30-008', type: 'CHARACTER', printingCode: 'ST30-008' },
      { name: 'Little Oz Junior', quantity: 4, cardNumber: 'ST30-009', type: 'CHARACTER', printingCode: 'ST30-009' },
      { name: 'Crocodile', quantity: 4, cardNumber: 'ST30-010', type: 'CHARACTER', printingCode: 'ST30-010' },
      { name: 'Baggy', quantity: 2, cardNumber: 'ST30-011', type: 'CHARACTER', printingCode: 'ST30-011' },
      { name: 'Monkey D. Luffy', quantity: 2, cardNumber: 'ST30-012', type: 'CHARACTER', printingCode: 'ST30-012' },
      { name: 'Mr 2 Bonclay(Bentham)', quantity: 4, cardNumber: 'ST30-013', type: 'CHARACTER', printingCode: 'ST30-013' },
      { name: 'Mr 3(Galdino)', quantity: 2, cardNumber: 'ST30-014', type: 'CHARACTER', printingCode: 'ST30-014' },
      { name: 'Cette ère... c\'est celle de Barbe Blanche !!', quantity: 4, cardNumber: 'ST30-015', type: 'EVENT', printingCode: 'ST30-015' },
      { name: 'Prêt à te battre, Luffy ?! Moi ? Toujours !', quantity: 2, cardNumber: 'ST30-016', type: 'EVENT', printingCode: 'ST30-016' },
      { name: 'Tu fonces toujours tête baissée vers le danger !!', quantity: 4, cardNumber: 'ST30-017', type: 'EVENT', printingCode: 'ST30-017' },
    ]
  },
  {
    deckName: 'RED Monkey.D.Luffy',
    deckCode: 'ST-31',
    cards: [
      { name: 'Monkey D. Luffy', quantity: 1, cardNumber: 'ST21-001', type: 'LEADER', printingCode: 'ST21-001_r1' },
      { name: 'Sanji', quantity: 2, cardNumber: 'ST31-001', type: 'CHARACTER', printingCode: 'ST31-001' },
      { name: 'Jinbe', quantity: 4, cardNumber: 'ST31-002', type: 'CHARACTER', printingCode: 'ST31-002' },
      { name: 'Brook', quantity: 4, cardNumber: 'ST31-003', type: 'CHARACTER', printingCode: 'ST31-003' },
      { name: 'Monkey D. Luffy', quantity: 2, cardNumber: 'ST31-004', type: 'CHARACTER', printingCode: 'ST31-004' },
      { name: 'Thousand Sunny', quantity: 2, cardNumber: 'ST31-005', type: 'STAGE', printingCode: 'ST31-005' },
      { name: 'Nami', quantity: 4, cardNumber: 'OP01-016', type: 'CHARACTER', printingCode: 'OP01-016_p2' },
      { name: 'Usopp', quantity: 4, cardNumber: 'OP11-003', type: 'CHARACTER', printingCode: 'OP11-003_r1' },
      { name: 'Nico Robin', quantity: 4, cardNumber: 'OP11-009', type: 'CHARACTER', printingCode: 'OP11-009_r1' },
      { name: 'Franky', quantity: 4, cardNumber: 'OP11-012', type: 'CHARACTER', printingCode: 'OP11-012_r1' },
      { name: 'Roronoa Zoro', quantity: 4, cardNumber: 'OP14-015', type: 'CHARACTER', printingCode: 'OP14-015_r1' },
      { name: 'Monkey D. Luffy', quantity: 4, cardNumber: 'ST23-004', type: 'CHARACTER', printingCode: 'ST23-004_r1' },
      { name: 'Tony-Tony Chopper', quantity: 4, cardNumber: 'P-101', type: 'CHARACTER', printingCode: 'P-101_r1' },
      { name: 'Menu "Bonnes manières", Kick Course', quantity: 4, cardNumber: 'OP04-016', type: 'EVENT', printingCode: 'OP04-016_p2' },
      { name: 'Gum Gum Rafale', quantity: 4, cardNumber: 'OP13-021', type: 'EVENT', printingCode: 'OP13-021_r1' },
    ]
  },
  {
    deckName: 'GREEN Roronoa Zoro',
    deckCode: 'ST-32',
    cards: [
      { name: 'Roronoa Zoro', quantity: 1, cardNumber: 'OP12-020', type: 'LEADER', printingCode: 'OP12-020_p3' },
      { name: 'Kinémon', quantity: 4, cardNumber: 'ST32-001', type: 'CHARACTER', printingCode: 'ST32-001' },
      { name: 'Oden Kozuki', quantity: 2, cardNumber: 'ST32-002', type: 'CHARACTER', printingCode: 'ST32-002' },
      { name: 'Dracule Mihawk', quantity: 2, cardNumber: 'ST32-003', type: 'CHARACTER', printingCode: 'ST32-003' },
      { name: 'Silvers Rayleigh', quantity: 4, cardNumber: 'ST32-004', type: 'CHARACTER', printingCode: 'ST32-004' },
      { name: 'Roronoa Zoro', quantity: 2, cardNumber: 'ST32-005', type: 'CHARACTER', printingCode: 'ST32-005' },
      { name: 'Perona', quantity: 4, cardNumber: 'OP10-036', type: 'CHARACTER', printingCode: 'OP10-036_r1' },
      { name: 'Kawamatsu', quantity: 4, cardNumber: 'OP12-023', type: 'CHARACTER', printingCode: 'OP12-023_r1' },
      { name: 'Kuina', quantity: 4, cardNumber: 'OP12-026', type: 'CHARACTER', printingCode: 'OP12-026_r1' },
      { name: 'Koshiro', quantity: 4, cardNumber: 'OP12-027', type: 'CHARACTER', printingCode: 'OP12-027_r1' },
      { name: 'Hiyori Kozuki', quantity: 4, cardNumber: 'OP12-028', type: 'CHARACTER', printingCode: 'OP12-028_r1' },
      { name: 'Tashigi', quantity: 4, cardNumber: 'OP12-031', type: 'CHARACTER', printingCode: 'OP12-031_r1' },
      { name: 'Ryuma', quantity: 4, cardNumber: 'OP15-036', type: 'CHARACTER', printingCode: 'OP15-036_r1' },
      { name: 'X-Drake', quantity: 4, cardNumber: 'ST24-005', type: 'CHARACTER', printingCode: 'ST24-005_r1' },
      { name: 'Luffy deviendra un jour le roi des pirates !!', quantity: 4, cardNumber: 'OP12-039', type: 'EVENT', printingCode: 'OP12-039_p1' },
    ]
  },
  {
    deckName: 'BLUE Kuzan',
    deckCode: 'ST-33',
    cards: [
      { name: 'Kuzan', quantity: 1, cardNumber: 'OP12-040', type: 'LEADER', printingCode: 'OP12-040_p2' },
      { name: 'Kobby', quantity: 4, cardNumber: 'ST33-001', type: 'CHARACTER', printingCode: 'ST33-001' },
      { name: 'Sakazuki', quantity: 4, cardNumber: 'ST33-002', type: 'CHARACTER', printingCode: 'ST33-002' },
      { name: 'Smoker', quantity: 2, cardNumber: 'ST33-003', type: 'CHARACTER', printingCode: 'ST33-003' },
      { name: 'Borsalino', quantity: 2, cardNumber: 'ST33-004', type: 'CHARACTER', printingCode: 'ST33-004' },
      { name: 'Monkey D. Garp', quantity: 2, cardNumber: 'ST33-005', type: 'CHARACTER', printingCode: 'ST33-005' },
      { name: 'Bluegrass', quantity: 4, cardNumber: 'EB04-026', type: 'CHARACTER', printingCode: 'EB04-026_r1' },
      { name: 'Kuzan', quantity: 4, cardNumber: 'OP12-043', type: 'CHARACTER', printingCode: 'OP12-043_r1' },
      { name: 'Jango', quantity: 4, cardNumber: 'OP12-045', type: 'CHARACTER', printingCode: 'OP12-045_r1' },
      { name: 'Zéphyr', quantity: 4, cardNumber: 'OP12-046', type: 'CHARACTER', printingCode: 'OP12-046_r1' },
      { name: 'Sengoku', quantity: 4, cardNumber: 'OP12-047', type: 'CHARACTER', printingCode: 'OP12-047_r1' },
      { name: 'Haguar D. Sauro', quantity: 4, cardNumber: 'OP12-050', type: 'CHARACTER', printingCode: 'OP12-050_r1' },
      { name: 'Fullbody', quantity: 4, cardNumber: 'OP12-052', type: 'CHARACTER', printingCode: 'OP12-052_r1' },
      { name: 'Ice Time', quantity: 4, cardNumber: 'EB04-028', type: 'EVENT', printingCode: 'EB04-028_p1' },
      { name: 'Ice Block, bec de faisan', quantity: 4, cardNumber: 'OP12-057', type: 'EVENT', printingCode: 'OP12-057_r1' },
    ]
  },
  {
    deckName: 'PURPLE Charlotte Katakuri',
    deckCode: 'ST-34',
    cards: [
      { name: 'Charlotte Katakuri', quantity: 1, cardNumber: 'OP11-062', type: 'LEADER', printingCode: 'OP11-062_p2' },
      { name: 'Charlotte Katakuri', quantity: 2, cardNumber: 'ST34-001', type: 'CHARACTER', printingCode: 'ST34-001' },
      { name: 'Charlotte Cracker', quantity: 4, cardNumber: 'ST34-002', type: 'CHARACTER', printingCode: 'ST34-002' },
      { name: 'Charlotte Brûlée', quantity: 2, cardNumber: 'ST34-003', type: 'CHARACTER', printingCode: 'ST34-003' },
      { name: 'Charlotte Linlin', quantity: 2, cardNumber: 'ST34-004', type: 'CHARACTER', printingCode: 'ST34-004' },
      { name: 'Baron Delœuf et Pekoms', quantity: 4, cardNumber: 'ST34-005', type: 'CHARACTER', printingCode: 'ST34-005' },
      { name: 'Charlotte Flampée', quantity: 4, cardNumber: 'EB03-032', type: 'CHARACTER', printingCode: 'EB03-032_r1' },
      { name: 'Charlotte Pudding', quantity: 4, cardNumber: 'EB03-035', type: 'CHARACTER', printingCode: 'EB03-035_r1' },
      { name: 'Charlotte Ananas', quantity: 4, cardNumber: 'OP11-065', type: 'CHARACTER', printingCode: 'OP11-065_r1' },
      { name: 'Charlotte Oven', quantity: 4, cardNumber: 'OP11-066', type: 'CHARACTER', printingCode: 'OP11-066_r1' },
      { name: 'Charlotte Daifuku', quantity: 4, cardNumber: 'OP11-068', type: 'CHARACTER', printingCode: 'OP11-068_r1' },
      { name: 'Charlotte Slurp', quantity: 4, cardNumber: 'OP11-071', type: 'CHARACTER', printingCode: 'OP11-071_r1' },
      { name: 'Charlotte Smoothie', quantity: 4, cardNumber: 'P-090', type: 'CHARACTER', printingCode: 'P-090_r1' },
      { name: 'Tes petits stratagèmes... n\'ont pas leur place dans un combat d\'hommes !!', quantity: 4, cardNumber: 'OP11-079', type: 'EVENT', printingCode: 'OP11-079_r1' },
      { name: 'Sabre impérial, lame destructrice', quantity: 4, cardNumber: 'OP11-081', type: 'EVENT', printingCode: 'OP11-081_r1' },
    ]
  },
  {
    deckName: 'RED/BLACK Sabo',
    deckCode: 'ST-35',
    cards: [
      { name: 'Sabo', quantity: 1, cardNumber: 'OP13-004', type: 'LEADER', printingCode: 'OP13-004_p2' },
      { name: 'Hack', quantity: 4, cardNumber: 'ST35-001', type: 'CHARACTER', printingCode: 'ST35-001' },
      { name: 'Lindbergh', quantity: 2, cardNumber: 'ST35-002', type: 'CHARACTER', printingCode: 'ST35-002' },
      { name: 'Corbeau', quantity: 4, cardNumber: 'ST35-003', type: 'CHARACTER', printingCode: 'ST35-003' },
      { name: 'Koala', quantity: 2, cardNumber: 'ST35-004', type: 'CHARACTER', printingCode: 'ST35-004' },
      { name: 'Bartholomew Kuma', quantity: 2, cardNumber: 'ST35-005', type: 'CHARACTER', printingCode: 'ST35-005' },
      { name: 'Belo Betty', quantity: 4, cardNumber: 'OP12-090', type: 'CHARACTER', printingCode: 'OP12-090_r1' },
      { name: 'Morley', quantity: 4, cardNumber: 'OP12-093', type: 'CHARACTER', printingCode: 'OP12-093_r1' },
      { name: 'Inazuma', quantity: 4, cardNumber: 'OP13-005', type: 'CHARACTER', printingCode: 'OP13-005_r1' },
      { name: 'Emporio Ivankov', quantity: 4, cardNumber: 'OP13-008', type: 'CHARACTER', printingCode: 'OP13-008_r1' },
      { name: 'Monkey D. Dragon', quantity: 4, cardNumber: 'OP13-017', type: 'CHARACTER', printingCode: 'OP13-017_r1' },
      { name: 'Koala', quantity: 4, cardNumber: 'OP13-081', type: 'CHARACTER', printingCode: 'OP13-081_r1' },
      { name: 'Sabo', quantity: 4, cardNumber: 'P-105', type: 'CHARACTER', printingCode: 'P-105_r1' },
      { name: 'Pointe dépilatoire', quantity: 4, cardNumber: 'OP12-098', type: 'EVENT', printingCode: 'OP12-098_r1' },
      { name: 'Les flammes d\'Ace, elles, ne vous ont pas pardonnés !', quantity: 4, cardNumber: 'OP13-019', type: 'EVENT', printingCode: 'OP13-019_p1' },
    ]
  },
 ]

export function simulateStarterDecks(catalog: CatalogCard[] | null) {
  const results = STARTER_LIST.map(deck => auditDeck(deck, productEvidence[deck.deckCode as keyof typeof productEvidence] as ProductEvidence, catalog))
  return { mode: 'DRY_RUN_ONLY', generatedAt: new Date().toISOString(), databaseChecked: catalog !== null, results,
    omitted: [{ deckCode: 'ST-36', status: 'BLOCKED', reasons: productEvidence['ST-36'].reasons }],
    counts: { VERIFIED: results.filter(row => row.status === 'VERIFIED').length,
      PARTIAL: results.filter(row => row.status === 'PARTIAL').length,
      BLOCKED: results.filter(row => row.status === 'BLOCKED').length + 1 } }
}

async function main() {
  const args = process.argv.slice(2)
  let catalogFile: string | undefined, reportFile: string | undefined, usePrisma = false
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === '--dry-run') continue
    if (arg === '--prisma') { usePrisma = true; continue }
    if (arg === '--catalog' || arg === '--report') {
      const value = args[++index]
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`)
      if (arg === '--catalog') catalogFile = value
      else reportFile = value
      continue
    }
    throw new Error(`Unsupported argument: ${arg}. This script only supports read-only simulation.`)
  }
  if (catalogFile && usePrisma) throw new Error('Choose either --catalog or --prisma')
  let catalog: CatalogCard[] | null = null
  if (catalogFile) {
    const data: unknown = JSON.parse(readFileSync(resolve(catalogFile), 'utf8'))
    if (!data || typeof data !== 'object' || !('rows' in data) || !Array.isArray(data.rows)) throw new Error('Expected a catalog snapshot with rows')
    catalog = data.rows as CatalogCard[]
    if (!catalog.every(row => row && typeof row.id === 'string' && typeof row.code === 'string' && typeof row.name === 'string' && typeof row.type === 'string' && typeof row.color === 'string')) throw new Error('Invalid catalog snapshot')
  }
  if (usePrisma) {
    const prisma = new PrismaClient()
    try {
      catalog = await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
        return tx.card.findMany({ select: { id: true, code: true, name: true, type: true, color: true, cost: true, power: true, counter: true,
          attribute: true, family: true, effect: true, ability: true, trigger: true, imageUrl: true, isAltArt: true, isParallel: true, isSpecial: true, setCode: true } })
      }, { timeout: 30000 })
    } finally { await prisma.$disconnect() }
  }
  const report = simulateStarterDecks(catalog)
  if (reportFile) writeFileSync(resolve(reportFile), JSON.stringify(report, null, 2) + '\n')
  for (const deck of report.results) console.log(`${deck.deckCode} ${deck.status} main=${deck.mainCount} leaders=${deck.leaders.length} DON=${deck.donCount} importReady=${deck.importReady}`)
  console.log('ST-36 BLOCKED: quantities not verified')
  console.log(JSON.stringify(report.counts))
  if (report.counts.PARTIAL || report.counts.BLOCKED) process.exitCode = 2
}

if (typeof require !== 'undefined' && require.main === module) {
  main().catch(() => {
    console.error('Starter audit failed. No deck was written; connection details are intentionally omitted.')
    process.exitCode = 1
  })
}
