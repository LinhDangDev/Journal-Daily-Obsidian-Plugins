import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StreakTracker } from "../streak-tracker";

// Helper: create date string in YYYY-MM-DD format
function dateStr(daysAgo: number): string {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

// Create a minimal StreakTracker for testing pure calculation methods
// We only test calculateCurrentStreak and calculateLongestStreak with explicit sortedDates
function createTracker(): StreakTracker {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return new StreakTracker(null as any, null as any);
}

describe("StreakTracker", () => {
	let tracker: StreakTracker;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 1, 26, 12, 0, 0)); // Feb 26, 2026 noon
		tracker = createTracker();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("calculateCurrentStreak", () => {
		it("returns 0 for empty dates", () => {
			expect(tracker.calculateCurrentStreak([])).toBe(0);
		});

		it("returns 1 for today only", () => {
			expect(tracker.calculateCurrentStreak(["2026-02-26"])).toBe(1);
		});

		it("returns 1 for yesterday only (within 1-day tolerance)", () => {
			expect(tracker.calculateCurrentStreak(["2026-02-25"])).toBe(1);
		});

		it("returns 0 when last entry is 2+ days ago", () => {
			expect(tracker.calculateCurrentStreak(["2026-02-24"])).toBe(0);
		});

		it("counts 3 consecutive days ending today", () => {
			const dates = ["2026-02-24", "2026-02-25", "2026-02-26"];
			expect(tracker.calculateCurrentStreak(dates)).toBe(3);
		});

		it("counts streak correctly with gap before streak", () => {
			const dates = ["2026-02-20", "2026-02-24", "2026-02-25", "2026-02-26"];
			expect(tracker.calculateCurrentStreak(dates)).toBe(3);
		});

		it("returns 5 for 5 consecutive days ending today", () => {
			const dates = [
				"2026-02-22",
				"2026-02-23",
				"2026-02-24",
				"2026-02-25",
				"2026-02-26",
			];
			expect(tracker.calculateCurrentStreak(dates)).toBe(5);
		});

		it("returns 2 for consecutive yesterday+today", () => {
			const dates = ["2026-02-25", "2026-02-26"];
			expect(tracker.calculateCurrentStreak(dates)).toBe(2);
		});
	});

	describe("calculateLongestStreak", () => {
		it("returns 0 for empty dates", () => {
			expect(tracker.calculateLongestStreak([])).toBe(0);
		});

		it("returns 1 for single entry", () => {
			expect(tracker.calculateLongestStreak(["2026-02-26"])).toBe(1);
		});

		it("returns 5 for 5 consecutive days", () => {
			const dates = [
				"2026-02-22",
				"2026-02-23",
				"2026-02-24",
				"2026-02-25",
				"2026-02-26",
			];
			expect(tracker.calculateLongestStreak(dates)).toBe(5);
		});

		it("returns longest of multiple streaks", () => {
			// 3-day streak, gap, 5-day streak
			const dates = [
				"2026-02-10",
				"2026-02-11",
				"2026-02-12",
				// gap
				"2026-02-20",
				"2026-02-21",
				"2026-02-22",
				"2026-02-23",
				"2026-02-24",
			];
			expect(tracker.calculateLongestStreak(dates)).toBe(5);
		});

		it("returns 1 when all entries have gaps", () => {
			const dates = ["2026-02-10", "2026-02-15", "2026-02-20"];
			expect(tracker.calculateLongestStreak(dates)).toBe(1);
		});

		it("returns correct longest when current is not the longest", () => {
			// 4-day streak, gap, 2-day streak
			const dates = [
				"2026-02-10",
				"2026-02-11",
				"2026-02-12",
				"2026-02-13",
				// gap
				"2026-02-25",
				"2026-02-26",
			];
			expect(tracker.calculateLongestStreak(dates)).toBe(4);
		});
	});
});
