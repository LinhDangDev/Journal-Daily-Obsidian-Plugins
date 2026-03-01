import { App, Modal } from "obsidian";
import { getAllTemplates, getPresetsForMode } from "./settings";
import type { JournalPluginSettings, WritingMode, TemplateEntry } from "./settings";

/**
 * Writing mode metadata for display in the mode selector.
 */
const WRITING_MODES: { mode: WritingMode; icon: string; name: string; description: string }[] = [
	{
		mode: "structured",
		icon: "📝",
		name: "Structured",
		description: "Predefined sections & prompts",
	},
	{
		mode: "free",
		icon: "✍️",
		name: "Free Writing",
		description: "Blank canvas, just write",
	},
	{
		mode: "stream",
		icon: "🧘",
		name: "Stream",
		description: "Unfiltered thoughts",
	},
	{
		mode: "narrative",
		icon: "📖",
		name: "Narrative",
		description: "Story-style diary entry",
	},
];

/**
 * Extract preview text from template content by stripping frontmatter
 * and returning the first few meaningful lines.
 */
function getPreviewText(content: string, maxLines = 3): string {
	let text = content;

	// Strip frontmatter
	if (text.startsWith("---")) {
		const endIndex = text.indexOf("---", 3);
		if (endIndex !== -1) {
			text = text.substring(endIndex + 3).trim();
		}
	}

	// Take first N non-empty lines
	const lines = text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.slice(0, maxLines);

	return lines.join("\n");
}

/**
 * Modal for picking a writing mode and template when creating a new journal entry.
 * Returns the selected template content via a Promise, or null if cancelled.
 */
export class TemplatePickerModal extends Modal {
	private resolve: (value: string | null) => void;
	private promise: Promise<string | null>;
	private resolved = false;
	private settings: JournalPluginSettings;

	constructor(app: App, settings: JournalPluginSettings) {
		super(app);
		this.settings = settings;
		this.promise = new Promise<string | null>((resolve) => {
			this.resolve = resolve;
		});
	}

	/**
	 * Open the modal and return the selected template content.
	 */
	async pickTemplate(): Promise<string | null> {
		this.open();
		return this.promise;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("journal-template-modal");

		// ARIA
		contentEl.setAttribute("role", "dialog");
		contentEl.setAttribute("aria-labelledby", "template-picker-title");

		if (this.settings.enableWritingModes) {
			this.renderModeSelector(contentEl);
		} else {
			this.renderTemplateGrid(contentEl);
		}
	}

	/**
	 * Render the writing mode selector (step 1).
	 */
	private renderModeSelector(container: HTMLElement): void {
		container.empty();
		container.addClass("journal-template-modal");

		const title = container.createDiv({
			text: "Choose your writing style",
			cls: "journal-template-title journal-section-heading",
		});
		title.setAttribute("id", "template-picker-title");

		container.createEl("p", {
			text: "How do you want to write today?",
			cls: "journal-template-subtitle",
		});

		const grid = container.createDiv({ cls: "journal-mode-grid" });

		for (let i = 0; i < WRITING_MODES.length; i++) {
			const modeInfo = WRITING_MODES[i];
			if (!modeInfo) continue;

			const card = grid.createDiv({ cls: "journal-mode-card" });
			card.style.setProperty("--card-index", String(i));

			// Highlight default mode
			if (modeInfo.mode === this.settings.defaultWritingMode) {
				card.addClass("is-default");
			}

			// Accessibility
			card.setAttribute("role", "button");
			card.setAttribute("tabindex", "0");
			card.setAttribute("aria-label", `Select ${modeInfo.name} writing mode`);

			// Icon
			card.createDiv({ cls: "journal-mode-icon", text: modeInfo.icon });

			// Name
			card.createDiv({ cls: "journal-mode-name", text: modeInfo.name });

			// Description
			card.createDiv({ cls: "journal-mode-desc", text: modeInfo.description });

			// Click handler
			const selectMode = () => {
				this.onModeSelected(modeInfo.mode);
			};

			card.addEventListener("click", selectMode);

			// Keyboard support
			card.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					selectMode();
				}
			});
		}

		// Skip button
		const skipBtn = container.createEl("button", {
			text: "Skip — use default template",
			cls: "journal-template-skip",
		});
		skipBtn.setAttribute("aria-label", "Skip and use default template");

		skipBtn.addEventListener("click", () => {
			if (!this.resolved) {
				this.resolved = true;
				this.resolve(this.settings.templateContent);
			}
			this.close();
		});
	}

	/**
	 * Handle mode selection: for structured mode show template grid, for others resolve immediately.
	 */
	private onModeSelected(mode: WritingMode): void {
		if (mode === "structured") {
			// Show the full template picker for structured mode
			const { contentEl } = this;
			contentEl.empty();
			this.renderTemplateGrid(contentEl);
		} else {
			// For free/stream/narrative, use the mode's template directly
			const presets = getPresetsForMode(mode);
			const presetKeys = Object.keys(presets);
			const firstKey = presetKeys[0];
			const template = firstKey ? presets[firstKey] : null;

			if (!this.resolved) {
				this.resolved = true;
				this.resolve(template?.content ?? this.settings.templateContent);
			}
			this.close();
		}
	}

	/**
	 * Render the template grid (step 2, or direct if writing modes disabled).
	 */
	private renderTemplateGrid(container: HTMLElement): void {
		container.empty();
		container.addClass("journal-template-modal");

		// Title
		const title = container.createDiv({
			text: "Choose a template",
			cls: "journal-template-title journal-section-heading",
		});
		title.setAttribute("id", "template-picker-title");

		container.createEl("p", {
			text: "Pick a template for today's journal",
			cls: "journal-template-subtitle",
		});

		// ARIA
		container.setAttribute("role", "dialog");
		container.setAttribute("aria-labelledby", "template-picker-title");

		// Template grid — show only structured templates when coming from mode selector
		const grid = container.createDiv({ cls: "journal-template-grid" });
		const templates = this.getFilteredTemplates();

		for (let i = 0; i < templates.length; i++) {
			const template = templates[i];
			if (!template) continue;

			const card = grid.createDiv({ cls: "journal-template-card" });
			card.style.setProperty("--card-index", String(i));

			// Highlight if this is the current default template
			if (template.content === this.settings.templateContent) {
				card.addClass("is-default");
			}

			// Accessibility
			card.setAttribute("role", "button");
			card.setAttribute("tabindex", "0");
			card.setAttribute("aria-label", `Select ${template.name} template`);

			// Icon
			card.createDiv({ cls: "journal-template-icon", text: template.icon });

			// Name
			card.createDiv({ cls: "journal-template-name", text: template.name });

			// Preview (strip frontmatter)
			const preview = getPreviewText(template.content);
			card.createDiv({ cls: "journal-template-preview", text: preview });

			// Click handler
			const selectTemplate = () => {
				if (!this.resolved) {
					this.resolved = true;
					this.resolve(template.content);
				}
				this.close();
			};

			card.addEventListener("click", selectTemplate);

			// Keyboard support
			card.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					selectTemplate();
				}
			});
		}

		// Back button (if writing modes are enabled, allow going back)
		if (this.settings.enableWritingModes) {
			const backBtn = container.createEl("button", {
				text: "← back to writing styles",
				cls: "journal-template-skip journal-template-skip-back",
			});
			backBtn.addEventListener("click", () => {
				this.renderModeSelector(container);
			});
		}

		// Skip button
		const skipBtn = container.createEl("button", {
			text: "Skip — use default template",
			cls: "journal-template-skip",
		});
		skipBtn.setAttribute("aria-label", "Skip template selection and use default");

		skipBtn.addEventListener("click", () => {
			if (!this.resolved) {
				this.resolved = true;
				this.resolve(this.settings.templateContent);
			}
			this.close();
		});
	}

	/**
	 * Get templates filtered for the current context.
	 * When writing modes are enabled and user selected structured, show only structured templates.
	 * Otherwise show all templates.
	 */
	private getFilteredTemplates(): TemplateEntry[] {
		return getAllTemplates(this.settings).filter((t) => {
			// When coming from structured mode selection, hide free/stream/narrative presets
			if (this.settings.enableWritingModes) {
				return t.id !== "free" && t.id !== "stream" && t.id !== "narrative";
			}
			return true;
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
