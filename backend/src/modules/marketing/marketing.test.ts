import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Context } from "../../trpc/context.js";
import { marketingRouter } from "./router.js";

vi.mock("../../lib/ai/landing-gateway.js", () => ({
  runLandingAsk: vi.fn(),
}));

vi.mock("../../lib/ratelimit.js", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("../../lib/mail/beta-request-mail.js", () => ({
  notifyBetaRequestSubmitted: vi.fn(),
}));

import { runLandingAsk } from "../../lib/ai/landing-gateway.js";
import { enforceRateLimit } from "../../lib/ratelimit.js";

const caller = marketingRouter.createCaller({
  db: {} as Context["db"],
  user: null,
  deviceSessionId: null,
  ip: "127.0.0.1",
  requestId: "test",
  sessionToken: undefined,
  setCookie: () => undefined,
});

describe("marketing.askEsti", () => {
  beforeEach(() => {
    vi.mocked(runLandingAsk).mockReset();
    vi.mocked(enforceRateLimit).mockReset();
  });

  it("returns Ollama answer on success", async () => {
    vi.mocked(runLandingAsk).mockResolvedValue({
      answer: "CRIF is the change register on each project.",
      model: "llama3.2",
    });

    const res = await caller.askEsti({ prompt: "What is CRIF?" });
    expect(res.answer).toContain("CRIF");
    expect(enforceRateLimit).toHaveBeenCalledWith("landing-ai-ip", "127.0.0.1", 20, 3600);
  });

  it("maps Ollama failure to SERVICE_UNAVAILABLE", async () => {
    vi.mocked(runLandingAsk).mockRejectedValue(new Error("Ollama unreachable"));

    await expect(caller.askEsti({ prompt: "What is AORMS?" })).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
  });

  it("rejects empty prompts via schema", async () => {
    await expect(caller.askEsti({ prompt: " " })).rejects.toBeTruthy();
  });
});
