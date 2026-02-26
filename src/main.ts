import { Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, JournalPluginSettings, JournalSettingTab } from "./settings";
import { JournalCreator } from "./journal-creator";
import { JournalCalendarView, CALENDAR_VIEW_TYPE } from "./calendar-view";
import { MoodPickerModal } from "./mood-modal";
import { TemplatePickerModal } from "./template-picker";
import { StreakTracker } from "./streak-tracker";
import { JournalNavigatorModal } from "./journal-navigator";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "./constants/messages";

export default class JournalPlugin extends Plugin {
	settings: JournalPluginSettings;
	journalCreator: JournalCreator;
	streakTracker: StreakTracker;

	async onload() {
		await this.loadSettings();

		this.journalCreator = new JournalCreator(this.app, this.settings);
		this.streakTracker = new StreakTracker(this.app, this.settings);

		// --- Register Calendar View ---
		this.registerView(
			CALENDAR_VIEW_TYPE,
			(leaf) => new JournalCalendarView(leaf, this)
		);

		// --- Ribbon Icon ---
		if (this.settings.showRibbonIcon) {
			this.addRibbonIcon("book-open", "Create today's journal", async () => {
				await this.openTodaysJournal();
			});
		}

		// --- Status Bar ---
		const statusBarItemEl = this.addStatusBarItem();
		this.updateStatusBar(statusBarItemEl);

		// Update status bar every minute (properly registered for cleanup)
		this.registerInterval(
			window.setInterval(() => this.updateStatusBar(statusBarItemEl), 60 * 1000)
		);

		// --- Commands ---
		this.addCommand({
			id: "create-todays-journal",
			name: "Create today's journal",
			callback: async () => {
				await this.openTodaysJournal();
			},
		});

		this.addCommand({
			id: "open-todays-journal",
			name: "Open today's journal",
			callback: async () => {
				await this.openTodaysJournal();
			},
		});

		this.addCommand({
			id: "create-yesterdays-journal",
			name: "Create yesterday's journal",
			callback: async () => {
				const yesterday = new Date();
				yesterday.setDate(yesterday.getDate() - 1);
				await this.openJournalForDate(yesterday);
			},
		});

		this.addCommand({
			id: "create-tomorrows-journal",
			name: "Create tomorrow's journal",
			callback: async () => {
				const tomorrow = new Date();
				tomorrow.setDate(tomorrow.getDate() + 1);
				await this.openJournalForDate(tomorrow);
			},
		});

		this.addCommand({
			id: "open-journal-calendar",
			name: "Open journal calendar",
			callback: async () => {
				await this.activateCalendarView();
			},
		});

		this.addCommand({
			id: "open-journal-navigator",
			name: "Browse all journal entries",
			callback: () => {
				new JournalNavigatorModal(this.app, this).open();
			},
		});

		this.addCommand({
			id: "insert-mood",
			name: "Set mood for today's journal",
			callback: async () => {
				await this.pickAndSetMood();
			},
		});

		// --- Settings Tab ---
		this.addSettingTab(new JournalSettingTab(this.app, this));

		// --- Open on Startup ---
		if (this.settings.openOnStartup) {
			this.app.workspace.onLayoutReady(async () => {
				await this.openTodaysJournal();
			});
		}
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(CALENDAR_VIEW_TYPE);
	}

	async openTodaysJournal(): Promise<void> {
		await this.openJournalForDate(new Date());
	}

	/**
	 * Open journal for a specific date with loading states and error handling.
	 */
	async openJournalForDate(date: Date): Promise<void> {
		let loadingNotice: Notice | null = null;

		try {
			const isNew = !this.journalCreator.exists(date);

			if (!isNew) {
				// Existing file — just open it
				const file = await this.journalCreator.createOrOpen(date);
				await this.openFile(file);
				new Notice(SUCCESS_MESSAGES.JOURNAL_OPENED);
				this.refreshCalendarView();
				return;
			}

			// --- New file flow ---

			// Step 1: Template picker (if enabled)
			let templateContent: string | undefined;
			if (this.settings.enableTemplatePicker) {
				const picker = new TemplatePickerModal(this.app, this.settings);
				const picked = await picker.pickTemplate();
				if (picked === null) {
					return; // User cancelled — abort, no file created
				}
				templateContent = picked;
			}

			// Step 2: Create file
			loadingNotice = new Notice(SUCCESS_MESSAGES.CREATING_ENTRY, 0);
			const file = await this.journalCreator.createOrOpen(date, templateContent);

			if (loadingNotice) {
				loadingNotice.hide();
				loadingNotice = null;
			}

			await this.openFile(file);
			new Notice(SUCCESS_MESSAGES.JOURNAL_CREATED);

			// Step 3: Mood picker (if enabled)
			if (this.settings.enableMoodTracker) {
				const modal = new MoodPickerModal(this.app);
				const mood = await modal.pickMood();
				if (mood) {
					await this.journalCreator.updateMood(file, `${mood.emoji} ${mood.label}`);
					new Notice(SUCCESS_MESSAGES.MOOD_SET(`${mood.emoji} ${mood.label}`));
				}
			}

			this.refreshCalendarView();
		} catch (error) {
			if (loadingNotice) {
				loadingNotice.hide();
			}
			console.error("Journal Plugin: Failed to create/open journal", error);
			new Notice(ERROR_MESSAGES.JOURNAL_CREATE_FAILED);
		}
	}

	private async pickAndSetMood(): Promise<void> {
		const today = new Date();
		const filePath = this.journalCreator.getJournalPath(today);
		const file = this.app.vault.getAbstractFileByPath(filePath);

		if (!(file instanceof TFile)) {
			new Notice(ERROR_MESSAGES.JOURNAL_NOT_FOUND);
			return;
		}

		const modal = new MoodPickerModal(this.app);
		const mood = await modal.pickMood();
		if (mood) {
			try {
				await this.journalCreator.updateMood(file, `${mood.emoji} ${mood.label}`);
				new Notice(SUCCESS_MESSAGES.MOOD_UPDATED(`${mood.emoji} ${mood.label}`));
				this.refreshCalendarView();
			} catch (error) {
				console.error("Journal Plugin: Failed to update mood", error);
				new Notice(ERROR_MESSAGES.MOOD_UPDATE_FAILED);
			}
		}
	}

	private async activateCalendarView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(CALENDAR_VIEW_TYPE);

		if (existing.length > 0 && existing[0]) {
			this.app.workspace.revealLeaf(existing[0]);
			return;
		}

		const leaf = this.app.workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: CALENDAR_VIEW_TYPE,
				active: true,
			});
			this.app.workspace.revealLeaf(leaf);
		}
	}

	private refreshCalendarView(): void {
		const leaves = this.app.workspace.getLeavesOfType(CALENDAR_VIEW_TYPE);
		for (const leaf of leaves) {
			const view = leaf.view;
			if (view instanceof JournalCalendarView) {
				view.refresh();
			}
		}
	}

	private async openFile(file: TFile): Promise<void> {
		let leaf: WorkspaceLeaf | null = this.app.workspace.getLeaf(false);

		if (!leaf) {
			leaf = this.app.workspace.getLeaf(true);
		}

		await leaf.openFile(file);
		this.app.workspace.setActiveLeaf(leaf, { focus: true });
	}

	private async updateStatusBar(el: HTMLElement): Promise<void> {
		const today = new Date();
		const hasJournal = this.journalCreator.exists(today);

		let text = hasJournal ? "📓 ✅" : "📓 ❌";

		if (this.settings.enableStreakCounter) {
			const stats = await this.streakTracker.getStats();
			if (stats.currentStreak > 0) {
				text += ` | 🔥 ${stats.currentStreak}`;
			}
		}

		el.setText(text);
		el.title = hasJournal
			? "Today's journal entry exists. Click to open."
			: "No journal entry for today. Click to create.";

		el.style.cursor = "pointer";
		el.onclick = async () => {
			try {
				await this.openTodaysJournal();
			} catch (error) {
				console.error("Journal Plugin: Failed to open today's journal", error);
				new Notice(ERROR_MESSAGES.JOURNAL_OPEN_FAILED);
			}
		};
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<JournalPluginSettings>
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		if (this.journalCreator) {
			this.journalCreator.updateSettings(this.settings);
		}
		if (this.streakTracker) {
			this.streakTracker.updateSettings(this.settings);
		}
	}
}
