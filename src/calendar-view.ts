import { ItemView, WorkspaceLeaf, TFile, Notice, normalizePath } from "obsidian";
import type JournalPlugin from "./main";
import { DateFormatter } from "./utils/date-formatter";
import { ERROR_MESSAGES } from "./constants/messages";

export const CALENDAR_VIEW_TYPE = "journal-calendar-view";

export class JournalCalendarView extends ItemView {
	plugin: JournalPlugin;
	private currentMonth: Date;
	private containerEl_calendar: HTMLElement;
	private journalDaysCache: Map<string, Set<number>> = new Map();
	private moodMapCache: Map<string, Map<number, string>> = new Map();

	constructor(leaf: WorkspaceLeaf, plugin: JournalPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.currentMonth = new Date();
	}

	getViewType(): string {
		return CALENDAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Journal calendar";
	}

	getIcon(): string {
		return "calendar-days";
	}

	async onOpen(): Promise<void> {
		await super.onOpen();
		const container = this.containerEl.children[1];
		if (!(container instanceof HTMLElement)) {
			console.error("Journal Calendar: Container element not found");
			new Notice(ERROR_MESSAGES.CALENDAR_INIT_FAILED);
			return;
		}
		container.empty();
		container.addClass("journal-calendar-container");

		this.containerEl_calendar = container;
		this.renderCalendar();
	}

	async onClose(): Promise<void> {
		await super.onClose();
		this.journalDaysCache.clear();
		this.moodMapCache.clear();
	}

	/**
	 * Invalidate caches and re-render.
	 */
	refresh(): void {
		this.journalDaysCache.clear();
		this.moodMapCache.clear();
		this.renderCalendar();
	}

	private cacheKey(year: number, month: number): string {
		return `${year}-${month}`;
	}

	private renderCalendar(): void {
		const container = this.containerEl_calendar;
		container.empty();

		// --- Header ---
		const header = container.createDiv({ cls: "journal-cal-header" });

		const prevBtn = header.createEl("button", {
			cls: "journal-cal-nav-btn",
			text: "‹",
			attr: { "aria-label": "Previous month" },
		});
		prevBtn.addEventListener("click", () => {
			this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
			this.renderCalendar();
		});

		const monthLabel = header.createEl("span", {
			cls: "journal-cal-month-label",
		});
		const monthNames = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December",
		];
		const monthName = monthNames[this.currentMonth.getMonth()] ?? "";
		monthLabel.setText(`${monthName} ${this.currentMonth.getFullYear()}`);

		const nextBtn = header.createEl("button", {
			cls: "journal-cal-nav-btn",
			text: "›",
			attr: { "aria-label": "Next month" },
		});
		nextBtn.addEventListener("click", () => {
			this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
			this.renderCalendar();
		});

		// --- Today button ---
		const todayBtn = container.createEl("button", {
			cls: "journal-cal-today-btn",
			text: "📍 today",
		});
		todayBtn.addEventListener("click", () => {
			this.currentMonth = new Date();
			this.renderCalendar();
		});

		// --- Day of week headers ---
		const weekHeader = container.createDiv({ cls: "journal-cal-weekdays" });
		const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
		for (const label of dayLabels) {
			weekHeader.createDiv({ cls: "journal-cal-weekday", text: label });
		}

		// --- Calendar Grid ---
		const grid = container.createDiv({ cls: "journal-cal-grid" });

		const year = this.currentMonth.getFullYear();
		const month = this.currentMonth.getMonth();

		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startDayOfWeek = firstDay.getDay();

		const today = new Date();
		const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

		// Build set of days that have journals (with caching)
		const journalDays = this.getJournalDaysForMonth(year, month);
		const moodMap = this.getMoodMapForMonth(year, month);

		// Empty cells before month start
		for (let i = 0; i < startDayOfWeek; i++) {
			grid.createDiv({ cls: "journal-cal-day journal-cal-day-empty" });
		}

		// Day cells
		for (let day = 1; day <= lastDay.getDate(); day++) {
			const dayEl = grid.createDiv({ cls: "journal-cal-day" });

			const dayNum = dayEl.createDiv({
				cls: "journal-cal-day-number",
				text: String(day),
			});

			// Accessibility
			dayNum.setAttribute("role", "button");
			dayNum.setAttribute("tabindex", "0");
			dayNum.setAttribute("aria-label", `Journal entry for ${monthName} ${day}, ${year}`);

			// Highlight today
			if (isCurrentMonth && today.getDate() === day) {
				dayEl.addClass("journal-cal-day-today");
			}

			// Highlight days with journals
			if (journalDays.has(day)) {
				dayEl.addClass("journal-cal-day-has-entry");

				const mood = moodMap.get(day);
				if (mood) {
					const moodDot = dayEl.createDiv({ cls: "journal-cal-mood-dot" });
					moodDot.setText(mood);
				}
			}

			// Future days
			if (
				year > today.getFullYear() ||
				(year === today.getFullYear() && month > today.getMonth()) ||
				(isCurrentMonth && day > today.getDate())
			) {
				dayEl.addClass("journal-cal-day-future");
			}

			// Click/keyboard handler
			const openJournal = async () => {
				const clickedDate = new Date(year, month, day);
				await this.plugin.openJournalForDate(clickedDate);
			};

			dayNum.addEventListener("click", () => { void openJournal(); });
			dayNum.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					void openJournal();
				}
			});
		}

		// --- Stats footer ---
		const stats = container.createDiv({ cls: "journal-cal-stats" });
		const totalInMonth = journalDays.size;
		const daysInMonth = lastDay.getDate();
		const daysPassedInMonth = isCurrentMonth
			? today.getDate()
			: month < today.getMonth() || year < today.getFullYear()
				? daysInMonth
				: 0;

		const percentage =
			daysPassedInMonth > 0 ? Math.round((totalInMonth / daysPassedInMonth) * 100) : 0;

		stats.createDiv({
			cls: "journal-cal-stat",
			text: `📝 ${totalInMonth}/${daysInMonth} entries`,
		});
		stats.createDiv({
			cls: "journal-cal-stat",
			text: `📊 ${percentage}% completion`,
		});
	}

	/**
	 * Get set of days in a month that have journal entries (with caching).
	 */
	private getJournalDaysForMonth(year: number, month: number): Set<number> {
		const key = this.cacheKey(year, month);

		if (this.journalDaysCache.has(key)) {
			return this.journalDaysCache.get(key)!;
		}

		const days = new Set<number>();
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const settings = this.plugin.settings;

		// Build file path lookup once
		const journalFiles = new Set(
			this.app.vault
				.getMarkdownFiles()
				.filter((f) => f.path.startsWith(settings.journalFolder + "/"))
				.map((f) => f.path),
		);

		for (let day = 1; day <= daysInMonth; day++) {
			const m = DateFormatter.padZero(month + 1);
			const d = DateFormatter.padZero(day);
			const y = year.toString();

			const formattedDate = settings.dateFormat
				.replace("YYYY", y)
				.replace("MM", m)
				.replace("DD", d);

			const filePath = normalizePath(
				`${settings.journalFolder}/${y}/${m}/${formattedDate}.md`,
			);

			if (journalFiles.has(filePath)) {
				days.add(day);
			}
		}

		this.journalDaysCache.set(key, days);
		return days;
	}

	/**
	 * Get mood data for days in a month (with caching).
	 */
	private getMoodMapForMonth(year: number, month: number): Map<number, string> {
		const key = this.cacheKey(year, month);

		if (this.moodMapCache.has(key)) {
			return this.moodMapCache.get(key)!;
		}

		const moods = new Map<number, string>();
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const settings = this.plugin.settings;

		for (let day = 1; day <= daysInMonth; day++) {
			const m = DateFormatter.padZero(month + 1);
			const d = DateFormatter.padZero(day);
			const y = year.toString();

			const formattedDate = settings.dateFormat
				.replace("YYYY", y)
				.replace("MM", m)
				.replace("DD", d);

			const filePath = normalizePath(
				`${settings.journalFolder}/${y}/${m}/${formattedDate}.md`,
			);

			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (file instanceof TFile) {
				const cache = this.app.metadataCache.getFileCache(file);
				const frontmatter = cache?.frontmatter;

				if (frontmatter && typeof frontmatter === "object") {
					const mood: unknown = frontmatter["mood"];
					if (typeof mood === "string" && mood.trim().length > 0) {
						const firstChar = mood.charAt(0);
						if (firstChar && /[\p{Emoji}]/u.test(firstChar)) {
							moods.set(day, firstChar);
						}
					}
				}
			}
		}

		this.moodMapCache.set(key, moods);
		return moods;
	}
}
