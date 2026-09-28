import Anthropic from "@anthropic-ai/sdk";

/** Traduit une erreur de l'API Anthropic en message clair pour l'écran (serveur uniquement). */
export function messageErreurApi(err: unknown, echecGenerique: string): { message: string; status: number } {
  // APIConnectionError hérite d'APIError dans le SDK TypeScript : on le teste d'abord.
  if (err instanceof Anthropic.APIConnectionError) {
    return { message: "Le service d'IA est injoignable (réseau ou délai dépassé). Réessayez dans un instant.", status: 504 };
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return { message: "La clé ANTHROPIC_API_KEY est refusée (invalide ou révoquée). Vérifiez-la dans les variables d'environnement.", status: 502 };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { message: "Limite d'utilisation de l'IA atteinte. Patientez une minute puis réessayez.", status: 429 };
  }
  if (err instanceof Anthropic.APIError) {
    if (err.status === 402 || err.type === "billing_error") {
      return { message: "Crédit Anthropic épuisé : rechargez le compte sur console.anthropic.com, puis réessayez.", status: 402 };
    }
    if (err.status === 529 || err.type === "overloaded_error" || (err.status ?? 0) >= 500) {
      return { message: "Le service d'IA est surchargé. Réessayez dans quelques minutes.", status: 503 };
    }
    return { message: `Le service d'IA a refusé la demande (${err.status ?? "?"} : ${err.message}).`, status: 502 };
  }
  return { message: echecGenerique, status: 500 };
}

