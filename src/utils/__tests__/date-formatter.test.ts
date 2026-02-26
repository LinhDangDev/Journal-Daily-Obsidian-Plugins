import { describe, it, expect } from "vitest";
import { DateFormatter } from "../date-formatter";

describe("DateFormatter", () => {
	describe("padZero", () => {
		it("pads single digit numbers", () => {
			expect(DateFormatter.padZero(0)).toBe("00");
			expect(DateFormatter.padZero(1)).toBe("01");
			expect(DateFormatter.padZero(5)).toBe("05");
			expect(DateFormatter.padZero(9)).toBe("09");
		});

		it("does not pad double digit numbers", () => {
			expect(DateFormatter.padZero(10)).toBe("10");
			expect(DateFormatter.padZero(25)).toBe("25");
			expect(DateFormatter.padZero(31)).toBe("31");
		});
	});

	describe("formatDate", () => {
		const date = new Date(2026, 1, 26); // Feb 26, 2026

		it("formats YYYY-MM-DD", () => {
			expect(DateFormatter.formatDate(date, "YYYY-MM-DD")).toBe("2026-02-26");
		});

		it("formats DD-MM-YYYY", () => {
			expect(DateFormatter.formatDate(date, "DD-MM-YYYY")).toBe("26-02-2026");
		});

		it("formats MM-DD-YYYY", () => {
			expect(DateFormatter.formatDate(date, "MM-DD-YYYY")).toBe("02-26-2026");
		});

		it("formats YYYY/MM/DD", () => {
			expect(DateFormatter.formatDate(date, "YYYY/MM/DD")).toBe("2026/02/26");
		});

		it("formats DD.MM.YYYY", () => {
			expect(DateFormatter.formatDate(date, "DD.MM.YYYY")).toBe("26.02.2026");
		});

		it("pads single-digit month and day", () => {
			const jan1 = new Date(2026, 0, 5); // Jan 5
			expect(DateFormatter.formatDate(jan1, "YYYY-MM-DD")).toBe("2026-01-05");
		});

		it("handles December 31", () => {
			const dec31 = new Date(2026, 11, 31);
			expect(DateFormatter.formatDate(dec31, "YYYY-MM-DD")).toBe("2026-12-31");
		});
	});

	describe("parseFromFormat", () => {
		it("parses YYYY-MM-DD correctly", () => {
			expect(DateFormatter.parseFromFormat("2026-02-26", "YYYY-MM-DD")).toBe("2026-02-26");
		});

		it("parses DD-MM-YYYY correctly", () => {
			expect(DateFormatter.parseFromFormat("26-02-2026", "DD-MM-YYYY")).toBe("2026-02-26");
		});

		it("parses MM-DD-YYYY correctly", () => {
			expect(DateFormatter.parseFromFormat("02-26-2026", "MM-DD-YYYY")).toBe("2026-02-26");
		});

		it("parses YYYY/MM/DD correctly", () => {
			expect(DateFormatter.parseFromFormat("2026/02/26", "YYYY/MM/DD")).toBe("2026-02-26");
		});

		it("parses DD.MM.YYYY correctly", () => {
			expect(DateFormatter.parseFromFormat("26.02.2026", "DD.MM.YYYY")).toBe("2026-02-26");
		});

		it("returns null for invalid string", () => {
			expect(DateFormatter.parseFromFormat("not-a-date", "YYYY-MM-DD")).toBeNull();
		});

		it("returns null for empty string", () => {
			expect(DateFormatter.parseFromFormat("", "YYYY-MM-DD")).toBeNull();
		});

		it("returns null for format without required fields", () => {
			expect(DateFormatter.parseFromFormat("2026-02", "YYYY-MM")).toBeNull();
		});
	});

	describe("parseSimpleDate", () => {
		it("parses valid YYYY-MM-DD", () => {
			const result = DateFormatter.parseSimpleDate("2026-02-26");
			expect(result).toBeInstanceOf(Date);
			expect(result!.getFullYear()).toBe(2026);
			expect(result!.getMonth()).toBe(1); // 0-indexed
			expect(result!.getDate()).toBe(26);
		});

		it("returns null for slash-separated format", () => {
			expect(DateFormatter.parseSimpleDate("2026/02/26")).toBeNull();
		});

		it("parses DD-MM-YYYY as valid (no order validation)", () => {
			// parseSimpleDate doesn't validate YYYY-MM-DD order, just splits by dash
			const result = DateFormatter.parseSimpleDate("26-02-2026");
			expect(result).toBeInstanceOf(Date);
		});

		it("returns null for empty string", () => {
			expect(DateFormatter.parseSimpleDate("")).toBeNull();
		});

		it("returns null for non-numeric parts", () => {
			expect(DateFormatter.parseSimpleDate("abc-de-fgh")).toBeNull();
		});
	});
});
