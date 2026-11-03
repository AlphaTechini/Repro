import { describe, expect, it } from "vitest";
import { renderIssueBody, renderIssueTitle, breakingMomentMs } from "../shared/repro/lib/issue-body";
import { fixtureReport } from "./fixtures/report.fixture";

describe("issue body", () => {
  it("renders the template with the breaking moment", () => {
    const body = renderIssueBody(fixtureReport);
    expect(breakingMomentMs(fixtureReport)).toBe(11800);
    expect(body).toContain("1. Open the cart\n2. Click Pay");
    expect(body).toContain("?at=11");
    expect(body).toContain("(breaks at 0:11)");
    expect(body).toContain("- Console: `TypeError: x is undefined`");
    expect(body).toContain("- Network: `POST /api/pay -> 500`");
    expect(body).toContain("**Frequency:** always · **Severity:** high");
    expect(body).toContain("the reporter confirmed: severity, frequency.");
    expect(body).not.toContain("SECRET");
    expect(body).not.toContain("undefined\n");
  });
  it("omits evidence lines without data", () => {
    const body = renderIssueBody({
      ...fixtureReport,
      evidence: null,
      fieldSources: {},
    });
    expect(body).not.toContain("Console:");
    expect(body).not.toContain("Network:");
    expect(body).toContain("- Recording: https://clips.example.test/share/abc123");
    expect(body).toContain("confirmed: none");
  });
  it("trims title", () => {
    expect(renderIssueTitle({ title: "  a   b " })).toBe("a b");
  });
});
