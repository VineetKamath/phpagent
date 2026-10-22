import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), check: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/public-check-history", () => ({ listPublicChecks: mocks.list, savePublicCheck: mocks.save }));
vi.mock("@/lib/public-repo", () => ({ checkPublicRepository: mocks.check }));
import { recheckPublicRepositories } from "@/lib/public-check-monitor";

const now = Date.parse("2026-10-22T12:00:00Z");
const entry = (repository: string, age: number) => ({ repository, checkedAt: new Date(now - age).toISOString() });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.check.mockImplementation(async (repository) => ({ repository }));
});

describe("hourly public repository monitoring", () => {
  it("checks only due repositories and includes the one-hour boundary", async () => {
    mocks.list.mockResolvedValue([entry("a/recent", 1000), entry("a/due", 3_600_000)]);
    const result = await recheckPublicRepositories(now);
    expect(mocks.list).toHaveBeenCalledWith(null);
    expect(mocks.check.mock.calls).toEqual([["a/due"]]);
    expect(mocks.save).toHaveBeenCalledWith({ repository: "a/due" });
    expect(result.checked).toBe(1);
  });

  it("preserves prior results on failure and continues checking other repositories", async () => {
    mocks.list.mockResolvedValue([entry("a/broken", 4_000_000), entry("a/working", 4_000_000)]);
    mocks.check.mockImplementation(async (repository) => {
      if (repository === "a/broken") throw new Error("GitHub HTTP 403");
      return { repository };
    });
    const result = await recheckPublicRepositories(now);
    expect(result.checked).toBe(1);
    expect(result.errors).toEqual(["a/broken: Error: GitHub HTTP 403"]);
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.save).toHaveBeenCalledWith({ repository: "a/working" });
  });

  it("skips overlapping runs and releases the lock after failure", async () => {
    let reject!: (error: Error) => void;
    mocks.list.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
    const first = recheckPublicRepositories(now);
    expect((await recheckPublicRepositories(now)).skippedRun).toBe(true);
    reject(new Error("database unavailable"));
    await expect(first).rejects.toThrow("database unavailable");
    mocks.list.mockResolvedValue([]);
    expect((await recheckPublicRepositories(now)).skippedRun).toBe(false);
  });

  it("limits concurrent repository checks to two", async () => {
    mocks.list.mockResolvedValue(Array.from({ length: 8 }, (_, i) => entry(`a/repo${i}`, 4_000_000)));
    let active = 0;
    let peak = 0;
    mocks.check.mockImplementation(async (repository) => {
      peak = Math.max(peak, ++active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return { repository };
    });
    expect((await recheckPublicRepositories(now)).checked).toBe(8);
    expect(peak).toBe(2);
  });
});
