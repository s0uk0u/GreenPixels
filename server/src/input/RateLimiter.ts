// Un "token bucket" minimaliste : on retient juste le dernier instant
// où chaque joueur a agi. Pas besoin de plus pour 1 action / 5 minutes.
export class RateLimiter {
  private derniereAction = new Map<string, number>();

  constructor(private cooldownMs: number) {}

  tryConsume(playerId: string): boolean {
    const maintenant = Date.now();
    const derniere = this.derniereAction.get(playerId) ?? 0;
    if (maintenant - derniere < this.cooldownMs) return false;
    this.derniereAction.set(playerId, maintenant);
    return true;
  }
}
