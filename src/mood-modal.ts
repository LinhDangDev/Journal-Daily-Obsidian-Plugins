import { App, Modal } from "obsidian";

export interface MoodOption {
	emoji: string;
	label: string;
	color: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
	{ emoji: "😄", label: "Great", color: "#4ade80" },
	{ emoji: "🙂", label: "Good", color: "#60a5fa" },
	{ emoji: "😐", label: "Okay", color: "#fbbf24" },
	{ emoji: "😔", label: "Sad", color: "#f97316" },
	{ emoji: "😡", label: "Awful", color: "#ef4444" },
];

/**
 * Modal for picking a mood when creating a new journal entry.
 * Returns the selected mood via a Promise.
 */
export class MoodPickerModal extends Modal {
	private resolve: (value: MoodOption | null) => void;
	private promise: Promise<MoodOption | null>;
	private resolved = false;

	constructor(app: App) {
		super(app);
		this.promise = new Promise<MoodOption | null>((resolve) => {
			this.resolve = resolve;
		});
	}

	/**
	 * Open the modal and return the selected mood.
	 */
	async pickMood(): Promise<MoodOption | null> {
		this.open();
		return this.promise;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("journal-mood-modal");

		// Title
		const title = contentEl.createDiv({
			text: "How are you feeling today?",
			cls: "journal-mood-title journal-section-heading",
		});
		title.setAttribute("id", "mood-picker-title");

		contentEl.createEl("p", {
			text: "Pick a mood for today's journal entry",
			cls: "journal-mood-subtitle",
		});

		// Set ARIA attributes on modal
		contentEl.setAttribute("role", "dialog");
		contentEl.setAttribute("aria-labelledby", "mood-picker-title");

		// Mood grid
		const grid = contentEl.createDiv({ cls: "journal-mood-grid" });

		for (let i = 0; i < MOOD_OPTIONS.length; i++) {
			const mood = MOOD_OPTIONS[i];
			if (!mood) continue;

			const btn = grid.createDiv({ cls: "journal-mood-btn" });
			btn.style.setProperty("--mood-color", mood.color);
			btn.style.setProperty("--btn-index", String(i));

			// Accessibility attributes
			btn.setAttribute("role", "button");
			btn.setAttribute("tabindex", "0");
			btn.setAttribute("aria-label", `Select ${mood.label} mood`);

			btn.createDiv({ cls: "journal-mood-emoji", text: mood.emoji });
			btn.createDiv({ cls: "journal-mood-label", text: mood.label });

			// Click handler with double-resolution guard
			const selectMood = () => {
				if (!this.resolved) {
					this.resolved = true;
					this.resolve(mood);
				}
				this.close();
			};

			btn.addEventListener("click", selectMood);

			// Keyboard support
			btn.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					selectMood();
				}
			});
		}

		// Skip button
		const skipBtn = contentEl.createEl("button", {
			text: "Skip — no mood today",
			cls: "journal-mood-skip",
		});
		skipBtn.setAttribute("aria-label", "Skip mood selection");

		skipBtn.addEventListener("click", () => {
			if (!this.resolved) {
				this.resolved = true;
				this.resolve(null);
			}
			this.close();
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
		// Guard against double resolution
		if (!this.resolved) {
			this.resolved = true;
			this.resolve(null);
		}
	}
}
