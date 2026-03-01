import { App, Modal } from "obsidian";
import type { JournalPluginSettings } from "./settings";
import { MOOD_OPTIONS } from "./mood-modal";
import type { MoodOption } from "./mood-modal";
import { ENERGY_OPTIONS, TRIGGER_CATEGORIES, EMOTION_TAGS } from "./constants/emotions";
import type { EnergyLevel } from "./constants/emotions";

export interface ExtendedMoodData {
	mood: MoodOption | null;
	energy: EnergyLevel | null;
	stress: number | null;
	emotions: string[];
	triggers: string[];
}

/**
 * Multi-panel mood picker modal for extended mood tracking.
 * Collects: mood → energy → stress → emotions → triggers
 */
export class ExtendedMoodModal extends Modal {
	private resolve: (value: ExtendedMoodData | null) => void;
	private promise: Promise<ExtendedMoodData | null>;
	private resolved = false;
	private settings: JournalPluginSettings;

	private data: ExtendedMoodData = {
		mood: null,
		energy: null,
		stress: null,
		emotions: [],
		triggers: [],
	};

	private currentPanel = 0;
	private panels: Array<() => void> = [];

	constructor(app: App, settings: JournalPluginSettings) {
		super(app);
		this.settings = settings;
		this.promise = new Promise<ExtendedMoodData | null>((resolve) => {
			this.resolve = resolve;
		});
	}

	async pickMood(): Promise<ExtendedMoodData | null> {
		this.open();
		return this.promise;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("journal-mood-modal", "journal-extended-mood");

		// Build panel sequence based on settings
		this.panels = [() => this.renderMoodPanel()];

		if (this.settings.enableEnergyTracking) {
			this.panels.push(() => this.renderEnergyPanel());
		}
		if (this.settings.enableStressTracking) {
			this.panels.push(() => this.renderStressPanel());
		}
		if (this.settings.enableEmotionTags) {
			this.panels.push(() => this.renderEmotionsPanel());
		}
		if (this.settings.enableMoodTriggers) {
			this.panels.push(() => this.renderTriggersPanel());
		}

		this.renderCurrentPanel();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
		if (!this.resolved) {
			this.resolved = true;
			this.resolve(null);
		}
	}

	private renderCurrentPanel(): void {
		const panel = this.panels[this.currentPanel];
		if (panel) {
			panel();
		}
	}

	private nextPanel(): void {
		if (this.currentPanel < this.panels.length - 1) {
			this.currentPanel++;
			this.renderCurrentPanel();
		} else {
			this.finish();
		}
	}

	private finish(): void {
		if (!this.resolved) {
			this.resolved = true;
			this.resolve(this.data);
		}
		this.close();
	}

	private renderHeader(title: string, subtitle: string): void {
		const { contentEl } = this;
		contentEl.empty();

		// Progress dots
		const progress = contentEl.createDiv({ cls: "journal-mood-progress" });
		for (let i = 0; i < this.panels.length; i++) {
			const dot = progress.createDiv({ cls: "journal-mood-progress-dot" });
			if (i === this.currentPanel) dot.addClass("is-active");
			if (i < this.currentPanel) dot.addClass("is-complete");
		}

		contentEl.createDiv({ text: title, cls: "journal-mood-title journal-section-heading" });
		contentEl.createEl("p", { text: subtitle, cls: "journal-mood-subtitle" });
	}

	// ─── Panel 1: Mood ───
	private renderMoodPanel(): void {
		this.renderHeader("How are you feeling?", "Pick a mood for today");

		const { contentEl } = this;
		const grid = contentEl.createDiv({ cls: "journal-mood-grid" });

		for (let i = 0; i < MOOD_OPTIONS.length; i++) {
			const mood = MOOD_OPTIONS[i];
			if (!mood) continue;

			const btn = grid.createDiv({ cls: "journal-mood-btn" });
			btn.style.setProperty("--mood-color", mood.color);
			btn.style.setProperty("--btn-index", String(i));
			btn.setAttribute("role", "button");
			btn.setAttribute("tabindex", "0");
			btn.setAttribute("aria-label", `Select ${mood.label} mood`);

			btn.createDiv({ cls: "journal-mood-emoji", text: mood.emoji });
			btn.createDiv({ cls: "journal-mood-label", text: mood.label });

			const select = () => {
				this.data.mood = mood;
				this.nextPanel();
			};
			btn.addEventListener("click", select);
			btn.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					select();
				}
			});
		}

		this.renderSkipButton(contentEl, "Skip mood");
	}

	// ─── Panel 2: Energy ───
	private renderEnergyPanel(): void {
		this.renderHeader("Energy level", "How's your energy today?");

		const { contentEl } = this;
		const grid = contentEl.createDiv({ cls: "journal-energy-grid" });

		for (let i = 0; i < ENERGY_OPTIONS.length; i++) {
			const option = ENERGY_OPTIONS[i];
			if (!option) continue;

			const btn = grid.createDiv({ cls: "journal-energy-btn" });
			btn.style.setProperty("--btn-index", String(i));
			btn.setAttribute("role", "button");
			btn.setAttribute("tabindex", "0");
			btn.setAttribute("aria-label", `Select ${option.label} energy`);

			btn.createDiv({ cls: "journal-energy-icon", text: option.icon });
			btn.createDiv({ cls: "journal-energy-label", text: option.label });

			const select = () => {
				this.data.energy = option.level;
				this.nextPanel();
			};
			btn.addEventListener("click", select);
			btn.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					select();
				}
			});
		}

		this.renderSkipButton(contentEl, "Skip energy");
	}

	// ─── Panel 3: Stress ───
	private renderStressPanel(): void {
		this.renderHeader("Stress level", "Rate your stress (1 = calm, 10 = very stressed)");

		const { contentEl } = this;
		const sliderContainer = contentEl.createDiv({ cls: "journal-stress-container" });

		const valueDisplay = sliderContainer.createDiv({ cls: "journal-stress-value", text: "5" });

		const slider = sliderContainer.createEl("input", {
			cls: "journal-stress-slider",
			attr: {
				type: "range",
				min: "1",
				max: "10",
				value: "5",
				"aria-label": "Stress level from 1 to 10",
			},
		});

		const colorStops = [
			"#4ade80",
			"#6ee77a",
			"#a3e635",
			"#d4e128",
			"#fbbf24",
			"#f59e0b",
			"#f97316",
			"#f87171",
			"#ef4444",
			"#dc2626",
		];

		const updateSlider = () => {
			const val = parseInt(slider.value, 10);
			valueDisplay.setText(String(val));
			const color = colorStops[val - 1] ?? "#fbbf24";
			const pct = ((val - 1) / 9) * 100;
			slider.style.setProperty("--stress-pct", `${pct}%`);
			slider.style.setProperty("--stress-color", color);
		};

		slider.addEventListener("input", updateSlider);
		updateSlider();

		// Stress level labels
		const labels = sliderContainer.createDiv({ cls: "journal-stress-labels" });
		labels.createSpan({ text: "😌 Calm" });
		labels.createSpan({ text: "😰 Stressed" });

		// Confirm button
		const confirmBtn = contentEl.createEl("button", {
			text: "Confirm",
			cls: "journal-stress-confirm mod-cta",
		});
		confirmBtn.addEventListener("click", () => {
			this.data.stress = parseInt(slider.value, 10);
			this.nextPanel();
		});

		this.renderSkipButton(contentEl, "Skip stress");
	}

	// ─── Panel 4: Emotions ───
	private renderEmotionsPanel(): void {
		this.renderHeader("Emotion tags", "Select all that apply (optional)");

		const { contentEl } = this;
		const grid = contentEl.createDiv({ cls: "journal-emotion-tags" });

		const selected = new Set<string>();
		const emotionList = this.settings.customEmotionTags.length > 0
			? this.settings.customEmotionTags
			: EMOTION_TAGS;

		for (const emotion of emotionList) {
			const pill = grid.createDiv({ cls: "journal-emotion-pill", text: emotion });
			pill.setAttribute("role", "checkbox");
			pill.setAttribute("tabindex", "0");
			pill.setAttribute("aria-checked", "false");

			const toggle = () => {
				if (selected.has(emotion)) {
					selected.delete(emotion);
					pill.removeClass("is-selected");
					pill.setAttribute("aria-checked", "false");
				} else {
					selected.add(emotion);
					pill.addClass("is-selected");
					pill.setAttribute("aria-checked", "true");
				}
			};

			pill.addEventListener("click", toggle);
			pill.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					toggle();
				}
			});
		}

		const confirmBtn = contentEl.createEl("button", {
			text: `Done${selected.size > 0 ? ` (${selected.size})` : ""}`,
			cls: "journal-emotion-confirm mod-cta",
		});
		confirmBtn.addEventListener("click", () => {
			this.data.emotions = [...selected];
			this.nextPanel();
		});

		this.renderSkipButton(contentEl, "Skip emotions");
	}

	// ─── Panel 5: Triggers ───
	private renderTriggersPanel(): void {
		this.renderHeader("What influenced your mood?", "Select triggers (optional)");

		const { contentEl } = this;
		const grid = contentEl.createDiv({ cls: "journal-trigger-grid" });

		const selected = new Set<string>();

		for (const trigger of TRIGGER_CATEGORIES) {
			const btn = grid.createDiv({ cls: "journal-trigger-btn" });
			btn.setAttribute("role", "checkbox");
			btn.setAttribute("tabindex", "0");
			btn.setAttribute("aria-checked", "false");
			btn.setAttribute("aria-label", `Select ${trigger.label} trigger`);

			btn.createDiv({ cls: "journal-trigger-icon", text: trigger.icon });
			btn.createDiv({ cls: "journal-trigger-label", text: trigger.label });

			const toggle = () => {
				if (selected.has(trigger.id)) {
					selected.delete(trigger.id);
					btn.removeClass("is-selected");
					btn.setAttribute("aria-checked", "false");
				} else {
					selected.add(trigger.id);
					btn.addClass("is-selected");
					btn.setAttribute("aria-checked", "true");
				}
			};

			btn.addEventListener("click", toggle);
			btn.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					toggle();
				}
			});
		}

		const confirmBtn = contentEl.createEl("button", {
			text: "Done",
			cls: "journal-trigger-confirm mod-cta",
		});
		confirmBtn.addEventListener("click", () => {
			this.data.triggers = [...selected];
			this.finish();
		});

		this.renderSkipButton(contentEl, "Skip triggers");
	}

	// ─── Shared ───
	private renderSkipButton(container: HTMLElement, label: string): void {
		const skipBtn = container.createEl("button", {
			text: label,
			cls: "journal-mood-skip",
		});
		skipBtn.setAttribute("aria-label", label);
		skipBtn.addEventListener("click", () => {
			this.nextPanel();
		});
	}
}
