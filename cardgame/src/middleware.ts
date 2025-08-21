export { auth as middleware } from "@/lib/auth"

// Protéger uniquement les zones privées (pages + API)
export const config = {
  matcher: [
    // Pages app protégées
    "/(collection|decks|deck-builder|booster-opening|game)(.*)",
    // API protégées
    "/api/(booster|collection|decks|game|user)(.*)",
  ],
}


