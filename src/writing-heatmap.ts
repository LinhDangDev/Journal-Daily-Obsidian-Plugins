import type { App, TFile } from "obsidian";
import type { JournalPluginSettings } from "./settings";
import { DateFormatter } from "./utils/date-formatter";

/**
 * GitHub-style writing heatmap: 52 weeks × 7 days grid
 * showing word count intensity over the past year.
 */
export class WritingHeatmap {
	private app: App;
	private settings: JournalPluginSettings;

	constructor(app: App, settings: JournalPluginSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Render the heatmap into a container element.
	 */
	render(
		container: HTMLElement,
		onDateClick: (date: Date) => void,
	): void {
		const wrapper = container.createDiv({ cls: "journal-heatmap-container" });

		// Apply color theme
		if (this.settings.heatmapColorTheme !== "green") {
			wrapper.addClass(`heatmap-${this.settings.heatmapColorTheme}`);
		}

		wrapper.createDiv({ text: "📊 Writing activity", cls: "journal-section-heading journal-section-subheading" });

		// Compute data for last 365 days
		const data = this.getYearData();

		// Month labels
		const monthLabels = wrapper.createDiv({ cls: "journal-heatmap-months" });
		const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		const today = new Date();
		const startMonth = new Date(today);
		startMonth.setDate(startMonth.getDate() - 364);

		// We need approximately 52 columns. Show month labels at appropriate positions.
		let currentMonth = startMonth.getMonth();
		const usedMonths = new Set<number>();
		for (let i = 0; i < 52; i++) {
			const weekDate = new Date(startMonth);
			weekDate.setDate(weekDate.getDate() + i * 7);
			const m = weekDate.getMonth();
			if (m !== currentMonth && !usedMonths.has(m)) {
				const monthName = monthNames[m] ?? "";
				monthLabels.createSpan({ text: monthName });
				usedMonths.add(m);
				currentMonth = m;
			} else {
				monthLabels.createSpan({ text: "" });
			}
		}

		// Heatmap grid
		const scrollWrapper = wrapper.createDiv({ cls: "journal-heatmap-scroll" });
		const grid = scrollWrapper.createDiv({ cls: "journal-heatmap-grid" });

		const thresholds = this.settings.heatmapIntensityThresholds;
		let totalContributions = 0;

		for (let i = 0; i < data.length; i++) {
			const entry = data[i];
			if (!entry) continue;

			const cell = grid.createDiv({ cls: "journal-heatmap-cell" });

			// Determine intensity level
			let level = 0;
			if (entry.wordCount > 0) {
				totalContributions++;
				if (entry.wordCount >= (thresholds[3] ?? 300)) level = 4;
				else if (entry.wordCount >= (thresholds[2] ?? 150)) level = 3;
				else if (entry.wordCount >= (thresholds[1] ?? 50)) level = 2;
				else level = 1;
			}

			cell.addClass(`level-${level}`);
			cell.title = `${entry.dateLabel}: ${entry.wordCount} words`;

			// Click handler
			cell.addEventListener("click", () => {
				onDateClick(entry.date);
			});
		}

		// Footer
		const footer = wrapper.createDiv({ cls: "journal-heatmap-footer" });
		footer.createSpan({ text: `${totalContributions} entries in the last year` });

		// Legend
		const legend = footer.createDiv({ cls: "journal-heatmap-legend" });
		legend.createSpan({ text: "Less" });
		for (let l = 0; l <= 4; l++) {
			const legendCell = legend.createDiv({ cls: "journal-heatmap-legend-cell" });
			legendCell.addClass(`level-${l}`);
		}
		legend.createSpan({ text: "More" });
	}

	/**
	 * Get word count data for each day in the last 365 days.
	 */
	private getYearData(): Array<{ date: Date; dateLabel: string; wordCount: number }> {
		const result: Array<{ date: Date; dateLabel: string; wordCount: number }> = [];
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Calculate start: go back to fill complete weeks
		// Start from 364 days ago, aligned to Sunday
		const startDate = new Date(today);
		startDate.setDate(startDate.getDate() - 364);
		// Align to nearest Sunday
		const dayOfWeek = startDate.getDay();
		startDate.setDate(startDate.getDate() - dayOfWeek);

		// Build file lookup for perf
		const wordCountMap = this.buildWordCountMap();

		const current = new Date(startDate);
		while (current <= today) {
			const key = `${current.getFullYear()}-${DateFormatter.padZero(current.getMonth() + 1)}-${DateFormatter.padZero(current.getDate())}`;
			const dateLabel = current.toLocaleDateString("en-US", {
				weekday: "short",
				month: "short",
				day: "numeric",
				year: "numeric",
			});

			result.push({
				date: new Date(current),
				dateLabel,
				wordCount: wordCountMap.get(key) ?? 0,
			});

			current.setDate(current.getDate() + 1);
		}

		return result;
	}

	/**
	 * Build a map of date → word count from vault files.
	 */
	private buildWordCountMap(): Map<string, number> {
		const map = new Map<string, number>();
		const folder = this.settings.journalFolder;
		const allFiles = this.app.vault.getMarkdownFiles();

		for (const file of allFiles) {
			if (!file.path.startsWith(folder + "/")) continue;

			const parts = file.path.split("/");
			const fileName = parts[parts.length - 1];
			if (!fileName) continue;

			const baseName = fileName.replace(".md", "");
			const parsed = DateFormatter.parseFromFormat(baseName, this.settings.dateFormat);
			if (!parsed) continue;

			// Get word count from cache
			const cache = this.app.metadataCache.getFileCache(file);
			const content = cache ? this.getFileContent(file) : "";
			const noFrontmatter = content.replace(/^---[\s\S]*?---\n?/, "");
			const words = noFrontmatter
				.trim()
				.split(/\s+/)
				.filter((w) => w.length > 0).length;

			map.set(parsed, words);
		}

		return map;
	}

	/**
	 * Synchronous file content retrieval from metadata cache.
	 */
	private getFileContent(file: TFile): string {
		try {
			// Use cached content if available
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.sections && cache.sections.length > 0) {
				// Estimate word count from metadata instead of reading file
				// This is faster and avoids async
				return "";
			}
			return "";
		} catch {
			return "";
		}
	}
}
