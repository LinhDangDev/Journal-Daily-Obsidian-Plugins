import { App } from "obsidian";
import type { JournalPluginSettings } from "./settings";
import { DateFormatter } from "./utils/date-formatter";

export interface StreakStats {
	currentStreak: number;
	longestStreak: number;
	totalEntries: number;
	totalWords: number;
}

export class StreakTracker {
	private app: App;
	private settings: JournalPluginSettings;

	constructor(app: App, settings: JournalPluginSettings) {
		this.app = app;
		this.settings = settings;
	}

	updateSettings(settings: JournalPluginSettings): void {
		this.settings = settings;
	}

	/**
	 * Calculate comprehensive journal stats.
	 */
	async getStats(): Promise<StreakStats> {
		const journalDates = this.getAllJournalDates();
		const currentStreak = this.calculateCurrentStreak(journalDates);
		const longestStreak = this.calculateLongestStreak(journalDates);
		const totalWords = await this.calculateTotalWords();

		return {
			currentStreak,
			longestStreak,
			totalEntries: journalDates.length,
			totalWords,
		};
	}

	calculateCurrentStreak(sortedDates?: string[]): number {
		const dates = sortedDates ?? this.getAllJournalDates();
		if (dates.length === 0) return 0;

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const lastDateStr = dates[dates.length - 1];
		if (!lastDateStr) return 0;

		const lastDate = DateFormatter.parseSimpleDate(lastDateStr);
		if (!lastDate) return 0;

		lastDate.setHours(0, 0, 0, 0);

		const diffDays = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
		if (diffDays > 1) return 0;

		let streak = 1;
		for (let i = dates.length - 2; i >= 0; i--) {
			const currentStr = dates[i + 1];
			const prevStr = dates[i];
			if (!currentStr || !prevStr) break;

			const current = DateFormatter.parseSimpleDate(currentStr);
			const prev = DateFormatter.parseSimpleDate(prevStr);
			if (!current || !prev) break;

			current.setHours(0, 0, 0, 0);
			prev.setHours(0, 0, 0, 0);

			const diff = Math.round((current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
			if (diff === 1) {
				streak++;
			} else {
				break;
			}
		}
		return streak;
	}

	calculateLongestStreak(sortedDates?: string[]): number {
		const dates = sortedDates ?? this.getAllJournalDates();
		if (dates.length === 0) return 0;

		let longest = 1;
		let current = 1;

		for (let i = 1; i < dates.length; i++) {
			const prevStr = dates[i - 1];
			const currStr = dates[i];
			if (!prevStr || !currStr) continue;

			const prev = DateFormatter.parseSimpleDate(prevStr);
			const curr = DateFormatter.parseSimpleDate(currStr);
			if (!prev || !curr) continue;

			prev.setHours(0, 0, 0, 0);
			curr.setHours(0, 0, 0, 0);

			const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
			if (diff === 1) {
				current++;
				longest = Math.max(longest, current);
			} else {
				current = 1;
			}
		}
		return longest;
	}

	getAllJournalDates(): string[] {
		const dates: string[] = [];
		const folder = this.settings.journalFolder;

		const allFiles = this.app.vault.getMarkdownFiles();
		for (const file of allFiles) {
			if (file.path.startsWith(folder + "/")) {
				const parts = file.path.split("/");
				const fileName = parts[parts.length - 1];
				if (!fileName) continue;

				const baseName = fileName.replace(".md", "");
				const parsed = DateFormatter.parseFromFormat(baseName, this.settings.dateFormat);
				if (parsed) {
					dates.push(parsed);
				}
			}
		}

		dates.sort();
		return dates;
	}

	private async calculateTotalWords(): Promise<number> {
		const folder = this.settings.journalFolder;
		let totalWords = 0;

		const allFiles = this.app.vault.getMarkdownFiles();
		for (const file of allFiles) {
			if (file.path.startsWith(folder + "/")) {
				try {
					const content = await this.app.vault.cachedRead(file);
					const noFrontmatter = content.replace(/^---[\s\S]*?---\n?/, "");
					const words = noFrontmatter
						.trim()
						.split(/\s+/)
						.filter((w) => w.length > 0);
					totalWords += words.length;
				} catch {
					// Skip files that can't be read
				}
			}
		}
		return totalWords;
	}
}
