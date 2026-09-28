import { describe, expect, it } from "vitest";
import { ROBOT_LECTURE_IA, robotAutorise } from "./robots";

// Extraits réels (28/09/2026), simplifiés.
const RTL = `User-agent: Amazonbot
User-agent: anthropic-ai
User-agent: ClaudeBot
User-agent: Claude-User
User-agent: Claude-Web
Disallow: /

User-agent: *
Disallow: /recherche`;

const RTBF = `User-Agent: anthropic-ai
Disallow: /

User-Agent: ClaudeBot
Disallow: /

User-Agent: *
Disallow: /api/
Allow: /`;

describe("robotAutorise", () => {
  it("RTL bloque le robot de lecture de l'IA", () => {
    expect(robotAutorise(RTL, ROBOT_LECTURE_IA, "/info/belgique/article-123")).toBe(false);
  });

  it("RTBF bloque les robots d'entraînement mais pas la lecture à la demande", () => {
    expect(robotAutorise(RTBF, ROBOT_LECTURE_IA, "/article/mutuelles-123")).toBe(true);
    expect(robotAutorise(RTBF, "ClaudeBot", "/article/mutuelles-123")).toBe(false);
    expect(robotAutorise(RTBF, ROBOT_LECTURE_IA, "/api/x")).toBe(false);
  });

  it("applique la règle la plus longue, Allow à égalité", () => {
    const r = "User-agent: *\nDisallow: /premium/\nAllow: /premium/gratuit/";
    expect(robotAutorise(r, "claude-user", "/premium/gratuit/a")).toBe(true);
    expect(robotAutorise(r, "claude-user", "/premium/b")).toBe(false);
  });

  it("gère les jokers et la fin d'adresse", () => {
    const r = "User-agent: claude-user\nDisallow: /*.pdf$\nDisallow: /*?print=";
    expect(robotAutorise(r, "claude-user", "/doc/a.pdf")).toBe(false);
    expect(robotAutorise(r, "claude-user", "/doc/a.pdf?x=1")).toBe(true);
    expect(robotAutorise(r, "claude-user", "/article?print=1")).toBe(false);
  });

  it("autorise tout sans règle, ou avec un Disallow vide", () => {
    expect(robotAutorise("", "claude-user", "/a")).toBe(true);
    expect(robotAutorise("User-agent: *\nDisallow:", "claude-user", "/a")).toBe(true);
  });
});
