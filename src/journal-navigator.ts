import { App, Modal, TFile, Notice } from "obsidian";
import type JournalPlugin from "./main";
import type { StreakStats } from "./streak-tracker";
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
		await this.renderStats(contentEl);

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

	private async renderStats(container: HTMLElement): Promise<void> {
		const stats: StreakStats = await this.plugin.streakTracker.getStats();

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
					const lines = noFrontmatter.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
					const preview = lines.slice(0, 3).join(" ").substring(0, 150);

					const mood = (cache?.frontmatter?.["mood"] as string) ?? "";

					const words = noFrontmatter.trim().split(/\s+/).filter((w) => w.length > 0).length;

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
}

interface JournalEntry {
	file: TFile;
	date: number;
	preview: string;
	mood: string;
	wordCount: number;
	content: string;
}
