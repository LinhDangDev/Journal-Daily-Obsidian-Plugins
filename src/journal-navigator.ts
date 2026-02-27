import { App, Modal, TFile, Notice } from "obsidian";
import type JournalPlugin from "./main";
import type { StreakStats } from "./streak-tracker";
import { WritingHeatmap } from "./writing-heatmap";
import {
	generateInsights,
	parseExtendedMoodFromFrontmatter,
	type JournalEntryData,
} from "./mood-analytics";
import { ERROR_MESSAGES } from "./constants/messages";

export class JournalNavigatorModal extends Modal {
	plugin: JournalPlugin;
	private allEntries: JournalEntry[] = [];
	private filteredEntries: JournalEntry[] = [];
	private listEl: HTMLElement;
	private searchTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor(app: App, plugin: JournalPlugin) {
		super(app);
		this.plugin = plugin;
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("journal-navigator-modal");

		// Title
		contentEl.createEl("h2", { text: "📚 Journal Navigator", cls: "journal-nav-title" });

		// Stats cards
		const stats = await this.plugin.streakTracker.getStats();
		this.renderStatsFromData(contentEl, stats);

		// Level bar & badge checking (if achievements enabled)
		if (this.plugin.settings.enableAchievements) {
			this.plugin.achievementTracker.renderLevelBar(contentEl);
			const newBadges = this.plugin.achievementTracker.checkBadges(stats);
			if (newBadges.length > 0) {
				this.plugin.achievementTracker.announceNewBadges(newBadges);
				await this.plugin.achievementTracker.saveData(
					() => this.plugin.loadData(),
					(d) => this.plugin.saveData(d),
				);
			}
		}

		// Writing heatmap (if enabled)
		if (this.plugin.settings.enableWritingHeatmap) {
			const heatmap = new WritingHeatmap(this.app, this.plugin.settings);
			heatmap.render(contentEl, (date) => {
				this.close();
				this.plugin.openJournalForDate(date);
			});
		}

		// Badge gallery (if achievements enabled)
		if (this.plugin.settings.enableAchievements) {
			this.plugin.achievementTracker.renderBadgeGallery(contentEl);
		}

		// Mood analytics
		await this.renderMoodAnalytics(contentEl);

		// Enhanced mood insights
		await this.renderMoodInsights(contentEl);

		// Search bar with accessibility
		const searchContainer = contentEl.createDiv({ cls: "journal-nav-search-container" });

		const searchLabel = searchContainer.createEl("label", {
			cls: "journal-nav-search-label",
			attr: { for: "journal-search-input" },
		});
		searchLabel.setText("Search journals");
		searchLabel.style.position = "absolute";
		searchLabel.style.width = "1px";
		searchLabel.style.height = "1px";
		searchLabel.style.overflow = "hidden";
		searchLabel.style.clip = "rect(0,0,0,0)";

		const searchInput = searchContainer.createEl("input", {
			cls: "journal-nav-search",
			attr: {
				type: "text",
				placeholder: "🔍 Search your journals...",
				id: "journal-search-input",
				"aria-label": "Search journal entries",
			},
		});

		// Debounced search
		searchInput.addEventListener("input", () => {
			if (this.searchTimeout) {
				clearTimeout(this.searchTimeout);
			}
			this.searchTimeout = setTimeout(() => {
				const query = searchInput.value.toLowerCase().trim();
				this.filterEntries(query);
			}, 300);
		});

		// Entry list
		this.listEl = contentEl.createDiv({ cls: "journal-nav-list" });

		// Load entries
		await this.loadEntries();
		this.renderEntries();

		// Focus search
		searchInput.focus();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();

		if (this.searchTimeout) {
			clearTimeout(this.searchTimeout);
			this.searchTimeout = null;
		}
	}

	private renderStatsFromData(container: HTMLElement, stats: StreakStats): void {
		const statsGrid = container.createDiv({ cls: "journal-nav-stats" });

		const statItems: Array<{ icon: string; value: string; label: string }> = [
			{ icon: "📝", value: String(stats.totalEntries), label: "Entries" },
			{ icon: "📊", value: this.formatWordCount(stats.totalWords), label: "Words" },
			{ icon: "🔥", value: String(stats.currentStreak), label: "Streak" },
			{ icon: "🏆", value: String(stats.longestStreak), label: "Best" },
		];

		for (let i = 0; i < statItems.length; i++) {
			const item = statItems[i];
			if (!item) continue;

			const card = statsGrid.createDiv({ cls: "journal-nav-stat-card" });
			card.style.setProperty("--card-index", String(i));
			card.createDiv({ cls: "journal-nav-stat-icon", text: item.icon });
			card.createDiv({ cls: "journal-nav-stat-value", text: item.value });
			card.createDiv({ cls: "journal-nav-stat-label", text: item.label });
		}
	}

	private async loadEntries(): Promise<void> {
		const folder = this.plugin.settings.journalFolder;
		const allFiles = this.app.vault.getMarkdownFiles();

		this.allEntries = [];

		for (const file of allFiles) {
			if (file.path.startsWith(folder + "/")) {
				try {
					const content = await this.app.vault.cachedRead(file);
					const cache = this.app.metadataCache.getFileCache(file);

					const noFrontmatter = content.replace(/^---[\s\S]*?---\n?/, "");
					const lines = noFrontmatter
						.split("\n")
						.filter((l) => l.trim() && !l.startsWith("#"));
					const preview = lines.slice(0, 3).join(" ").substring(0, 150);

					const mood = (cache?.frontmatter?.["mood"] as string) ?? "";

					const words = noFrontmatter
						.trim()
						.split(/\s+/)
						.filter((w) => w.length > 0).length;

					this.allEntries.push({
						file,
						date: file.stat.ctime,
						preview: preview || "Empty journal entry",
						mood,
						wordCount: words,
						content: content.toLowerCase(),
					});
				} catch {
					// Skip unreadable files
				}
			}
		}

		this.allEntries.sort((a, b) => b.date - a.date);
		this.filteredEntries = [...this.allEntries];
	}

	private filterEntries(query: string): void {
		if (!query) {
			this.filteredEntries = [...this.allEntries];
		} else {
			this.filteredEntries = this.allEntries.filter((entry) => {
				return (
					entry.content.includes(query) ||
					entry.file.basename.toLowerCase().includes(query) ||
					entry.mood.toLowerCase().includes(query)
				);
			});
		}
		this.renderEntries();
	}

	private renderEntries(): void {
		this.listEl.empty();

		if (this.filteredEntries.length === 0) {
			const empty = this.listEl.createDiv({ cls: "journal-nav-empty" });

			empty.createDiv({
				cls: "journal-nav-empty-icon",
				text: "📭",
			});

			if (this.allEntries.length === 0) {
				empty.createDiv({
					cls: "journal-nav-empty-title",
					text: "No journal entries yet",
				});
				empty.createDiv({
					cls: "journal-nav-empty-subtitle",
					text: "Start writing your first journal entry!",
				});
			} else {
				empty.createDiv({
					cls: "journal-nav-empty-title",
					text: "No results found",
				});
				empty.createDiv({
					cls: "journal-nav-empty-subtitle",
					text: "Try a different search term",
				});
			}
			return;
		}

		for (let i = 0; i < this.filteredEntries.length; i++) {
			const entry = this.filteredEntries[i];
			if (!entry) continue;

			const item = this.listEl.createDiv({ cls: "journal-nav-item" });
			item.style.setProperty("--item-index", String(i));

			// Header row
			const header = item.createDiv({ cls: "journal-nav-item-header" });

			header.createDiv({
				cls: "journal-nav-item-title",
				text: entry.file.basename,
			});

			if (entry.mood) {
				header.createDiv({
					cls: "journal-nav-item-mood",
					text: entry.mood,
				});
			}

			// Meta row
			const meta = item.createDiv({ cls: "journal-nav-item-meta" });
			const dateStr = new Date(entry.date).toLocaleDateString("en-US", {
				weekday: "short",
				year: "numeric",
				month: "short",
				day: "numeric",
			});
			meta.createSpan({ text: `📅 ${dateStr}` });
			meta.createSpan({ text: `  •  ✏️ ${entry.wordCount} words` });

			// Preview
			item.createDiv({
				cls: "journal-nav-item-preview",
				text: entry.preview + (entry.preview.length >= 150 ? "..." : ""),
			});

			// Click handler with error handling
			item.addEventListener("click", async () => {
				try {
					const leaf = this.plugin.app.workspace.getLeaf(false);
					if (leaf) {
						await leaf.openFile(entry.file);
					} else {
						throw new Error("No active leaf available");
					}
					this.close();
				} catch (error) {
					console.error("Journal Navigator: Failed to open entry", error);
					new Notice(ERROR_MESSAGES.JOURNAL_OPEN_FAILED);
				}
			});
		}
	}

	private formatWordCount(count: number): string {
		if (count >= 1000) {
			return `${(count / 1000).toFixed(1)}k`;
		}
		return String(count);
	}

	private async renderMoodAnalytics(container: HTMLElement): Promise<void> {
		const section = container.createDiv({ cls: "journal-mood-analytics" });
		section.createEl("h3", { text: "😊 Mood Analytics (Last 30 Days)" });

		// Collect mood data for last 30 days
		const moodMap = new Map<string, string>(); // dateStr -> mood emoji
		for (const entry of this.allEntries) {
			if (entry.mood) {
				const d = new Date(entry.date);
				const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
				moodMap.set(key, entry.mood);
			}
		}

		// Build 30-day grid
		const grid = section.createDiv({ cls: "journal-mood-grid-30" });
		const distribution = new Map<string, number>();
		const now = new Date();

		for (let i = 29; i >= 0; i--) {
			const date = new Date(now);
			date.setDate(date.getDate() - i);
			const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
			const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

			const mood = moodMap.get(key) ?? "";
			const cell = grid.createDiv({ cls: "journal-mood-cell" });
			cell.setText(mood || "·");
			cell.title = `${dateLabel}: ${mood || "No mood"}`;

			if (mood) {
				distribution.set(mood, (distribution.get(mood) ?? 0) + 1);
			}
		}

		// Distribution bars
		if (distribution.size > 0) {
			const distSection = section.createDiv({ cls: "journal-mood-distribution" });
			const maxCount = Math.max(...distribution.values());

			const moodColors: Record<string, string> = {
				"😄": "#4ade80",
				"🙂": "#60a5fa",
				"😐": "#fbbf24",
				"😢": "#f87171",
				"😡": "#ef4444",
			};

			for (const [mood, count] of distribution.entries()) {
				const bar = distSection.createDiv({ cls: "journal-mood-dist-bar" });
				bar.createSpan({ text: mood, cls: "journal-mood-dist-emoji" });

				const fill = bar.createDiv({ cls: "journal-mood-dist-fill" });
				const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
				fill.style.width = `${pct}%`;
				fill.style.backgroundColor = moodColors[mood] ?? "var(--text-muted)";

				bar.createSpan({ text: String(count), cls: "journal-mood-dist-count" });
			}
		} else {
			section.createDiv({
				cls: "journal-mood-empty",
				text: "No mood data yet. Track your mood when creating journal entries!",
			});
		}
	}

	/**
	 * Render mood insights from extended mood data.
	 */
	private async renderMoodInsights(container: HTMLElement): Promise<void> {
		// Build JournalEntryData from all entries
		const entries: JournalEntryData[] = [];
		const folder = this.plugin.settings.journalFolder;
		const allFiles = this.app.vault.getMarkdownFiles().filter((f) => f.path.startsWith(folder + "/"));

		for (const file of allFiles) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;

			const parsed = parseExtendedMoodFromFrontmatter(cache.frontmatter as Record<string, unknown>);
			if (!parsed.mood) continue;

			entries.push({
				file,
				date: new Date(file.stat.ctime),
				mood: parsed.mood,
				moodScore: parsed.moodScore,
				energy: parsed.energy,
				stress: parsed.stress,
				emotions: parsed.emotions,
				triggers: parsed.triggers,
				wordCount: 0,
			});
		}

		if (entries.length < 3) return;

		const insights = generateInsights(entries);
		if (insights.length === 0) return;

		const section = container.createDiv({ cls: "journal-mood-insights" });
		section.createEl("h3", { text: "💡 Insights" });

		for (const insight of insights) {
			const item = section.createDiv({ cls: "journal-insight-item" });
			item.createSpan({ text: insight });
		}
	}
}

interface JournalEntry {
	file: TFile;
	date: number;
	preview: string;
	mood: string;
	wordCount: number;
	content: string;
}
