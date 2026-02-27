import type { TFile } from "obsidian";
import type { EnergyLevel } from "./constants/emotions";

/**
 * Parsed journal entry data for analytics.
 */
export interface JournalEntryData {
	file: TFile;
	date: Date;
	mood: string;
	moodScore: number; // 1-5 (awful=1, great=5)
	energy: EnergyLevel | null;
	stress: number | null;
	emotions: string[];
	triggers: string[];
	wordCount: number;
}

const MOOD_SCORE_MAP: Record<string, number> = {
	"😄": 5,
	"🙂": 4,
	"😐": 3,
	"😔": 2,
	"😡": 1,
};

/**
 * Extract mood score from emoji string.
 */
export function getMoodScore(mood: string): number {
	if (!mood) return 0;
	const firstChar = mood.charAt(0);
	return MOOD_SCORE_MAP[firstChar] ?? 0;
}

/**
 * Mood distribution over a time period.
 */
export function getMoodDistribution(
	entries: JournalEntryData[],
	days: number,
): Map<string, number> {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - days);

	const dist = new Map<string, number>();
	for (const entry of entries) {
		if (entry.date >= cutoff && entry.mood) {
			const emoji = entry.mood.charAt(0);
			if (emoji) {
				dist.set(emoji, (dist.get(emoji) ?? 0) + 1);
			}
		}
	}
	return dist;
}

/**
 * Average mood score per day of week (0=Sun, 6=Sat).
 */
export function getMoodByDayOfWeek(
	entries: JournalEntryData[],
): { day: string; avgScore: number; count: number }[] {
	const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	const sums = new Array(7).fill(0) as number[];
	const counts = new Array(7).fill(0) as number[];

	for (const entry of entries) {
		if (entry.moodScore > 0) {
			const dow = entry.date.getDay();
			sums[dow] = (sums[dow] ?? 0) + entry.moodScore;
			counts[dow] = (counts[dow] ?? 0) + 1;
		}
	}

	return dayNames.map((name, i) => {
		const c = counts[i] ?? 0;
		const s = sums[i] ?? 0;
		return {
			day: name,
			avgScore: c > 0 ? Math.round((s / c) * 10) / 10 : 0,
			count: c,
		};
	});
}

/**
 * Mood score vs word count correlation data points.
 */
export function getMoodWordCorrelation(
	entries: JournalEntryData[],
): { moodScore: number; wordCount: number }[] {
	return entries
		.filter((e) => e.moodScore > 0 && e.wordCount > 0)
		.map((e) => ({ moodScore: e.moodScore, wordCount: e.wordCount }));
}

/**
 * Energy level trend over time.
 */
export function getEnergyTrend(
	entries: JournalEntryData[],
	days: number,
): { date: string; level: EnergyLevel }[] {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - days);

	return entries
		.filter((e) => e.date >= cutoff && e.energy !== null)
		.sort((a, b) => a.date.getTime() - b.date.getTime())
		.map((e) => ({
			date: e.date.toISOString().slice(0, 10),
			level: e.energy ?? "medium" as EnergyLevel,
		}));
}

/**
 * Stress trend over time.
 */
export function getStressTrend(
	entries: JournalEntryData[],
	days: number,
): { date: string; stress: number }[] {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - days);

	return entries
		.filter((e) => e.date >= cutoff && e.stress !== null)
		.sort((a, b) => a.date.getTime() - b.date.getTime())
		.map((e) => ({
			date: e.date.toISOString().slice(0, 10),
			stress: e.stress ?? 5,
		}));
}

/**
 * Top N most frequent emotion tags.
 */
export function getEmotionFrequency(
	entries: JournalEntryData[],
	topN = 10,
): { emotion: string; count: number }[] {
	const freq = new Map<string, number>();

	for (const entry of entries) {
		for (const emotion of entry.emotions) {
			freq.set(emotion, (freq.get(emotion) ?? 0) + 1);
		}
	}

	return [...freq.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, topN)
		.map(([emotion, count]) => ({ emotion, count }));
}

/**
 * Trigger → average mood score correlation.
 */
export function getTriggerCorrelation(
	entries: JournalEntryData[],
): { trigger: string; avgMood: number; count: number }[] {
	const sums = new Map<string, number>();
	const counts = new Map<string, number>();

	for (const entry of entries) {
		if (entry.moodScore > 0) {
			for (const trigger of entry.triggers) {
				sums.set(trigger, (sums.get(trigger) ?? 0) + entry.moodScore);
				counts.set(trigger, (counts.get(trigger) ?? 0) + 1);
			}
		}
	}

	return [...sums.entries()]
		.map(([trigger, sum]) => ({
			trigger,
			avgMood: Math.round((sum / (counts.get(trigger) ?? 1)) * 10) / 10,
			count: counts.get(trigger) ?? 0,
		}))
		.sort((a, b) => b.avgMood - a.avgMood);
}

/**
 * Generate text-based insights from journal data.
 */
export function generateInsights(entries: JournalEntryData[]): string[] {
	const insights: string[] = [];

	if (entries.length === 0) return insights;

	// Best day of week
	const dowData = getMoodByDayOfWeek(entries);
	const bestDay = dowData.reduce((a, b) => (a.avgScore > b.avgScore ? a : b));
	if (bestDay.avgScore > 0 && bestDay.count >= 2) {
		insights.push(`You tend to feel best on ${bestDay.day}s (avg ${bestDay.avgScore}/5)`);
	}

	// Worst day
	const scored = dowData.filter((d) => d.avgScore > 0 && d.count >= 2);
	if (scored.length >= 2) {
		const worstDay = scored.reduce((a, b) => (a.avgScore < b.avgScore ? a : b));
		if (worstDay.day !== bestDay.day) {
			insights.push(`${worstDay.day}s are usually your toughest days`);
		}
	}

	// Trigger correlation
	const triggers = getTriggerCorrelation(entries);
	const bestTrigger = triggers.find((t) => t.count >= 3 && t.avgMood >= 4);
	if (bestTrigger) {
		insights.push(`"${bestTrigger.trigger}" days tend to boost your mood`);
	}

	// Recent mood trend
	const recent7 = entries.filter((e) => {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - 7);
		return e.date >= cutoff && e.moodScore > 0;
	});
	if (recent7.length >= 3) {
		const avgRecent = recent7.reduce((s, e) => s + e.moodScore, 0) / recent7.length;
		if (avgRecent >= 4) {
			insights.push("You've been having a great week! 🌟");
		} else if (avgRecent <= 2.5) {
			insights.push("This week has been challenging. Be kind to yourself 💙");
		}
	}

	// Top emotion
	const emotions = getEmotionFrequency(entries, 1);
	if (emotions.length > 0 && emotions[0]) {
		insights.push(`Your most common emotion: "${emotions[0].emotion}" (${emotions[0].count}×)`);
	}

	// Avg stress
	const stressed = entries.filter((e) => e.stress !== null);
	if (stressed.length >= 5) {
		const avgStress = stressed.reduce((s, e) => s + (e.stress ?? 0), 0) / stressed.length;
		const rounded = Math.round(avgStress * 10) / 10;
		if (avgStress <= 3) {
			insights.push(`Your average stress is ${rounded}/10 — nicely managed! 😌`);
		} else if (avgStress >= 7) {
			insights.push(`Your average stress is ${rounded}/10 — consider some relaxation 🧘`);
		}
	}

	return insights;
}

/**
 * Parse extended mood data from frontmatter object.
 */
export function parseExtendedMoodFromFrontmatter(frontmatter: Record<string, unknown>): {
	mood: string;
	moodScore: number;
	energy: EnergyLevel | null;
	stress: number | null;
	emotions: string[];
	triggers: string[];
} {
	const mood = typeof frontmatter["mood"] === "string" ? frontmatter["mood"] : "";
	const energy =
		typeof frontmatter["energy"] === "string" &&
		["low", "medium", "high"].includes(frontmatter["energy"])
			? (frontmatter["energy"] as EnergyLevel)
			: null;
	const stress =
		typeof frontmatter["stress"] === "number" &&
		frontmatter["stress"] >= 1 &&
		frontmatter["stress"] <= 10
			? frontmatter["stress"]
			: null;

	const rawEmotions = frontmatter["emotions"];
	const emotions: string[] = Array.isArray(rawEmotions)
		? rawEmotions.filter((e): e is string => typeof e === "string")
		: [];

	const rawTriggers = frontmatter["triggers"];
	const triggers: string[] = Array.isArray(rawTriggers)
		? rawTriggers.filter((t): t is string => typeof t === "string")
		: [];

	return { mood, moodScore: getMoodScore(mood), energy, stress, emotions, triggers };
}
