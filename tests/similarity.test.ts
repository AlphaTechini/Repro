import { describe, expect, it } from "vitest";
import { isLikelyDuplicate, rankCandidates, scoreSimilarity, titleSimilarity } from "../shared/repro/lib/similarity";

describe("similarity", () => {
  it("exact signature is strong", () => {
    const s = scoreSimilarity(
      { title: "A", errorSignature: "sig" },
      { title: "Totally different", errorSignature: "sig" },
    );
    expect(s.score).toBeGreaterThanOrEqual(0.9);
    expect(isLikelyDuplicate(s.score)).toBe(true);
  });
  it("title overlap is weighted below threshold unless identical", () => {
    expect(titleSimilarity("Checkout spins forever", "checkout spins forever!")).toBe(1);
    const s = scoreSimilarity(
      { title: "Checkout spins forever", errorSignature: null },
      { title: "Checkout spins on pay", errorSignature: null },
    );
    expect(s.score).toBeGreaterThan(0.2);
    expect(s.score).toBeLessThan(0.75);
  });
  it("ranks and drops weak", () => {
    const r = rankCandidates(
      [
        { item: "x", input: { title: "unrelated thing", errorSignature: null } },
        { item: "y", input: { title: "login button broken", errorSignature: null } },
      ],
      { title: "login button broken", errorSignature: null },
    );
    expect(r.map((c) => c.item)).toEqual(["y"]);
  });
});
