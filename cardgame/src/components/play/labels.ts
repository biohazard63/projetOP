// French labels of engine codes. Unknown codes fall back to a generic message, never to raw state.
export const PHASES: Record<string, string> = {
  CHOOSE_FIRST: 'Choix du premier joueur', MULLIGAN: 'Main de départ', REFRESH: 'Phase de redressement', DRAW: 'Phase de pioche', DON: 'Phase DON!!', MAIN: 'Phase principale', END: 'Phase de fin',
}
export const BATTLE_STEPS: Record<string, string> = {
  BLOCKER: 'Étape de blocage', COUNTER: 'Étape de Counter', DAMAGE: 'Résolution du combat', LIFE_TRIGGER: 'Trigger de Vie', LIFE_CONTINUE: 'Dégâts de Vie',
}
export const RESULTS: Record<string, string> = {
  LEADER_DAMAGED_AT_ZERO_LIFE: 'Leader touché sans carte de Vie', EMPTY_DECK: 'Deck vide', CONCESSION: 'Abandon',
}
const ERRORS: Record<string, string> = {
  STALE_VERSION: 'La partie a changé dans un autre onglet : affichage mis à jour.', ILLEGAL_ACTION: 'Action impossible maintenant.', GAME_FINISHED: 'Cette partie est terminée.',
  ACTIVE_GAME_EXISTS: 'Une partie est déjà en cours.', DECK_NOT_PLAYABLE: 'Ce deck n’est pas jouable par le moteur.', RATE_LIMITED: 'Trop d’actions rapprochées, réessayez dans un instant.',
  UNAUTHENTICATED: 'Connectez-vous pour jouer.', GAME_NOT_FOUND: 'Partie introuvable.', COMMAND_ID_CONFLICT: 'Action déjà envoyée.', SERVER_ERROR: 'Erreur serveur, réessayez.',
  INVALID_CHOICE_RESPONSE: 'Sélection invalide.', COUNTER_EVENT_INITIAL_UNPAYABLE: 'Coût impossible à payer.', INVALID_PAYMENT: 'Paiement invalide.', NETWORK: 'Connexion perdue, réessayez.',
}
export const errorLabel = (code: string) => ERRORS[code] ?? (code.startsWith('INVALID') || code.startsWith('COUNTER') ? 'Action refusée par les règles.' : 'Action refusée.')
const DECK_ERRORS: [RegExp, string][] = [
  [/^NOT_IN_ENGINE_CATALOG/, 'contient des cartes que le moteur ne sait pas encore jouer'], [/^CARD_DATA_CONFLICT/, 'contient une carte dont les données diffèrent de la définition revue'],
  [/^EXACTLY_FIFTY_MAIN/, 'ne compte pas exactement 50 cartes'], [/^EXACTLY_ONE_LEADER/, 'n’a pas exactement un Leader'], [/^INCOMPATIBLE_COLOR/, 'contient une couleur absente du Leader'],
  [/^TOO_MANY_COPIES/, 'dépasse 4 exemplaires d’un numéro'], [/^RESTRICTED|^BANNED/, 'contient une carte interdite ou restreinte'], [/^UNKNOWN_PRINTING|^NOT_ADMITTED|^UNSUPPORTED/, 'contient une carte non prise en charge'],
  [/^RESTRICTIONS_OUT_OF_DATE/, 'ne peut pas être validé : liste de restrictions à revérifier'],
  [/^INVALID_FREE_FORMAT/, 'ne peut pas être validé : format libre mal configuré'],
]
export const deckErrorLabel = (code: string) => DECK_ERRORS.find(([pattern]) => pattern.test(code))?.[1] ?? 'n’est pas jouable'
const MINE: Record<string, string> = {
  DRAWN: 'Vous piochez', DON_ADDED: 'Vous recevez des DON!!', CARD_PLAYED: 'Vous jouez une carte', ATTACK_DECLARED: 'Vous attaquez', BLOCKER_ACTIVATED: 'Vous bloquez',
  COUNTER_PLAYED: 'Vous jouez un Counter', LIFE_DAMAGED: 'Vous perdez une Vie', TRIGGER_ACTIVATED: 'Vous activez un Trigger', LIFE_PAID: 'Vous payez une Vie',
  LIFE_TRASHED: 'Une de vos Vies est défaussée', LIFE_TO_HAND: 'Vous ajoutez une Vie à votre main', LIFE_ADDED: 'Une carte rejoint vos Vies', DON_ATTACHED: 'Vous donnez un DON!!', HAND_REDRAWN: 'Vous repiochez votre main', TURN_ENDED: 'Fin de votre tour',
}
const BOT: Record<string, string> = {
  DRAWN: 'Le bot pioche', DON_ADDED: 'Le bot reçoit des DON!!', CARD_PLAYED: 'Le bot joue une carte', ATTACK_DECLARED: 'Le bot attaque', BLOCKER_ACTIVATED: 'Le bot bloque',
  COUNTER_PLAYED: 'Le bot joue un Counter', LIFE_DAMAGED: 'Le bot perd une Vie', TRIGGER_ACTIVATED: 'Le bot active un Trigger', LIFE_PAID: 'Le bot paie une Vie',
  LIFE_TRASHED: 'Une Vie du bot est défaussée', LIFE_TO_HAND: 'Le bot ajoute une Vie à sa main', LIFE_ADDED: 'Une carte rejoint les Vies du bot', DON_ATTACHED: 'Le bot donne un DON!!', HAND_REDRAWN: 'Le bot repioche sa main', TURN_ENDED: 'Fin du tour du bot',
}
const ANY: Record<string, string> = { CHARACTER_KO: 'Un Personnage est K.O.', BATTLE_RESOLVED: 'Combat résolu', GAME_ENDED: 'Fin de la partie' }
export const eventLabel = (type: string, mine: boolean): string | null => ANY[type] ?? (mine ? MINE : BOT)[type] ?? null
