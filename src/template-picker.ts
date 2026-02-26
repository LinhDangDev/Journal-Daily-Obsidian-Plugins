import { App, Modal } from "obsidian";
import { getAllTemplates } from "./settings";
import type { JournalPluginSettings } from "./settings";

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
 * Modal for picking a template when creating a new journal entry.
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

		// Title
		const title = contentEl.createEl("h2", {
			text: "Choose a Template",
			cls: "journal-template-title",
		});
		title.setAttribute("id", "template-picker-title");

		contentEl.createEl("p", {
			text: "Pick a template for today's journal",
			cls: "journal-template-subtitle",
		});

		// ARIA
		contentEl.setAttribute("role", "dialog");
		contentEl.setAttribute("aria-labelledby", "template-picker-title");

		// Template grid
		const grid = contentEl.createDiv({ cls: "journal-template-grid" });
		const templates = getAllTemplates(this.settings);

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

		// Skip button
		const skipBtn = contentEl.createEl("button", {
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
