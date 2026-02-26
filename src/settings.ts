import { App, Modal, Notice, PluginSettingTab, Setting } from "obsidian";
import type JournalPlugin from "./main";
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "./constants/messages";

export interface CustomTemplate {
	id: string;
	name: string;
	icon: string;
	content: string;
}

export interface TemplateEntry {
	id: string;
	name: string;
	icon: string;
	content: string;
	isBuiltIn: boolean;
}

export interface JournalPluginSettings {
	journalFolder: string;
	dateFormat: string;
	templateContent: string;
	openOnStartup: boolean;
	showRibbonIcon: boolean;
	enableMoodTracker: boolean;
	enableDailyQuote: boolean;
	enableStreakCounter: boolean;
	enableTemplatePicker: boolean;
	customTemplates: CustomTemplate[];
}

export const DEFAULT_SETTINGS: JournalPluginSettings = {
	journalFolder: "Journal",
	dateFormat: "YYYY-MM-DD",
	templateContent: `---
date: "{{date}}"
day: "{{dayOfWeek}}"
mood: ""
tags: [journal]
---

# 📝 Journal — {{date}}

> *💡 "{{quote}}"*

## 🌅 Morning Reflection
- How am I feeling today?
- What am I grateful for?

## 🎯 Goals for Today
- [ ]
- [ ]
- [ ]

## 📖 Notes & Thoughts


## 🌙 Evening Review
- What went well today?
- What could be improved?
- One thing I learned:

`,
	openOnStartup: false,
	showRibbonIcon: true,
	enableMoodTracker: true,
	enableDailyQuote: true,
	enableStreakCounter: true,
	enableTemplatePicker: false,
	customTemplates: [],
};

// --- Template Presets ---
export const TEMPLATE_PRESETS: Record<string, { name: string; icon: string; content: string }> = {
	default: {
		name: "Full Journal",
		icon: "📝",
		content: DEFAULT_SETTINGS.templateContent,
	},
	minimal: {
		name: "Minimal",
		icon: "✏️",
		content: `---
date: "{{date}}"
mood: ""
tags: [journal]
---

# {{date}} — {{dayOfWeek}}

> *"{{quote}}"*

## Today


## Thoughts


`,
	},
	gratitude: {
		name: "Gratitude Journal",
		icon: "🙏",
		content: `---
date: "{{date}}"
day: "{{dayOfWeek}}"
mood: ""
tags: [journal, gratitude]
---

# 🙏 Gratitude — {{date}}

> *"{{quote}}"*

## Three things I'm grateful for today
1.
2.
3.

## One person I appreciate and why


## A small moment that made me smile today


## How I can spread kindness tomorrow


`,
	},
	bullet: {
		name: "Bullet Journal",
		icon: "📋",
		content: `---
date: "{{date}}"
day: "{{dayOfWeek}}"
mood: ""
tags: [journal, bullet]
---

# ⚡ {{date}} | {{dayOfWeek}}

> *"{{quote}}"*

## 📌 Tasks
- [ ]
- [ ]
- [ ]

## 📅 Events


## 📝 Notes


## 💡 Ideas


## ⏭️ Tomorrow
- [ ]

`,
	},
	weekly: {
		name: "Weekly Review",
		icon: "📆",
		content: `---
date: "{{date}}"
day: "{{dayOfWeek}}"
mood: ""
tags: [journal, weekly-review]
---

# 📆 Weekly Review — Week of {{date}}

> *"{{quote}}"*

## 🏆 Wins This Week
1.
2.
3.

## 📊 Progress on Goals
| Goal | Progress | Notes |
|------|----------|-------|
|      |          |       |

## 🧠 Lessons Learned


## 🎯 Focus for Next Week
1.
2.
3.

## 🔋 Energy & Well-being
- Physical:  /10
- Mental:    /10
- Emotional: /10

`,
	},
};

export function getAllTemplates(settings: JournalPluginSettings): TemplateEntry[] {
	const builtIn: TemplateEntry[] = Object.entries(TEMPLATE_PRESETS).map(([id, preset]) => ({
		id,
		name: preset.name,
		icon: preset.icon,
		content: preset.content,
		isBuiltIn: true,
	}));

	const custom: TemplateEntry[] = settings.customTemplates.map((t) => ({
		...t,
		isBuiltIn: false,
	}));

	return [...builtIn, ...custom];
}

const DATE_FORMAT_OPTIONS: Record<string, string> = {
	"YYYY-MM-DD": "2026-02-26 (ISO)",
	"DD-MM-YYYY": "26-02-2026",
	"MM-DD-YYYY": "02-26-2026",
	"YYYY/MM/DD": "2026/02/26",
	"DD.MM.YYYY": "26.02.2026",
};

export class JournalSettingTab extends PluginSettingTab {
	plugin: JournalPlugin;

	constructor(app: App, plugin: JournalPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Header
		containerEl.createEl("h2", { text: "📓 Journal Settings" });

		// --- Folder Settings ---
		containerEl.createEl("h3", { text: "📁 Organization" });

		new Setting(containerEl)
			.setName("Journal folder")
			.setDesc("Root folder for your journal entries. Subfolders will be created by year/month.")
			.addText((text) =>
				text
					.setPlaceholder("Journal")
					.setValue(this.plugin.settings.journalFolder)
					.onChange(async (value) => {
						const normalized = value.trim() || "Journal";
						if (!this.isValidFolderName(normalized)) {
							new Notice(ERROR_MESSAGES.INVALID_FOLDER_NAME);
							text.setValue(this.plugin.settings.journalFolder);
							return;
						}
						this.plugin.settings.journalFolder = normalized;
						await this.saveWithFeedback();
					})
			);

		new Setting(containerEl)
			.setName("Date format")
			.setDesc("Format used for journal file names.")
			.addDropdown((dropdown) => {
				for (const [format, example] of Object.entries(DATE_FORMAT_OPTIONS)) {
					dropdown.addOption(format, example);
				}
				dropdown.setValue(this.plugin.settings.dateFormat);
				dropdown.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.saveWithFeedback();
				});
			});

		// --- Features ---
		containerEl.createEl("h3", { text: "✨ Features" });

		new Setting(containerEl)
			.setName("Mood tracker")
			.setDesc("Show a mood picker when creating a new journal entry.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableMoodTracker)
					.onChange(async (value) => {
						this.plugin.settings.enableMoodTracker = value;
						await this.saveWithFeedback();
					})
			);

		new Setting(containerEl)
			.setName("Daily quote")
			.setDesc("Include an inspirational quote in new entries via {{quote}} variable.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableDailyQuote)
					.onChange(async (value) => {
						this.plugin.settings.enableDailyQuote = value;
						await this.saveWithFeedback();
					})
			);

		new Setting(containerEl)
			.setName("Writing streak counter")
			.setDesc("Show your writing streak in the status bar.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableStreakCounter)
					.onChange(async (value) => {
						this.plugin.settings.enableStreakCounter = value;
						await this.saveWithFeedback();
					})
			);

		new Setting(containerEl)
			.setName("Template picker")
			.setDesc("Show a template picker when creating a new journal entry.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableTemplatePicker)
					.onChange(async (value) => {
						this.plugin.settings.enableTemplatePicker = value;
						await this.saveWithFeedback();
					})
			);

		// --- Custom Templates ---
		containerEl.createEl("h3", { text: "📄 Custom Templates" });

		// List existing custom templates
		for (let i = 0; i < this.plugin.settings.customTemplates.length; i++) {
			const template = this.plugin.settings.customTemplates[i];
			if (!template) continue;

			new Setting(containerEl)
				.setName(`${template.icon} ${template.name}`)
				.setDesc("Custom template")
				.addButton((button) =>
					button
						.setButtonText("Edit")
						.onClick(() => {
							new CustomTemplateEditorModal(
								this.app,
								template,
								async (updated) => {
									this.plugin.settings.customTemplates[i] = updated;
									await this.plugin.saveSettings();
									this.display();
									new Notice("✅ Template updated");
								}
							).open();
						})
				)
				.addButton((button) =>
					button
						.setButtonText("Delete")
						.setWarning()
						.onClick(async () => {
							const confirmed = await this.showConfirmationModal(
								"Delete Template?",
								`Delete "${template.name}"? This cannot be undone.`
							);
							if (confirmed) {
								this.plugin.settings.customTemplates.splice(i, 1);
								await this.plugin.saveSettings();
								this.display();
								new Notice("✅ Template deleted");
							}
						})
				);
		}

		// Add new custom template button
		new Setting(containerEl)
			.setName("Add custom template")
			.setDesc("Create a new template for the template picker.")
			.addButton((button) =>
				button
					.setButtonText("+ Add")
					.setCta()
					.onClick(() => {
						const newTemplate: CustomTemplate = {
							id: Date.now().toString(36),
							name: "New Template",
							icon: "📄",
							content: DEFAULT_SETTINGS.templateContent,
						};
						new CustomTemplateEditorModal(
							this.app,
							newTemplate,
							async (saved) => {
								this.plugin.settings.customTemplates.push(saved);
								await this.plugin.saveSettings();
								this.display();
								new Notice("✅ Template added");
							}
						).open();
					})
			);

		// --- Behavior Settings ---
		containerEl.createEl("h3", { text: "⚙️ Behavior" });

		new Setting(containerEl)
			.setName("Open journal on startup")
			.setDesc("Automatically open today's journal entry when Obsidian starts.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openOnStartup)
					.onChange(async (value) => {
						this.plugin.settings.openOnStartup = value;
						await this.saveWithFeedback();
					})
			);

		new Setting(containerEl)
			.setName("Show ribbon icon")
			.setDesc("Show the journal icon in the left sidebar. (Restart required)")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showRibbonIcon)
					.onChange(async (value) => {
						this.plugin.settings.showRibbonIcon = value;
						await this.saveWithFeedback();
					})
			);

		// --- Template Settings ---
		containerEl.createEl("h3", { text: "📝 Template" });

		// Template Presets
		new Setting(containerEl)
			.setName("Template presets")
			.setDesc("Load a pre-built template. This will replace your current template.")
			.addDropdown((dropdown) => {
				dropdown.addOption("", "— Select a preset —");
				for (const [key, preset] of Object.entries(TEMPLATE_PRESETS)) {
					dropdown.addOption(key, preset.name);
				}
				dropdown.onChange(async (value) => {
					const preset = TEMPLATE_PRESETS[value];
					if (preset) {
						this.plugin.settings.templateContent = preset.content;
						await this.plugin.saveSettings();
						this.display();
						new Notice(`✅ Template loaded: ${preset.name}`);
					}
				});
			});

		new Setting(containerEl)
			.setName("Journal template")
			.setDesc(
				"Template for new journal entries. Variables: {{date}}, {{time}}, {{dayOfWeek}}, {{year}}, {{month}}, {{monthName}}, {{day}}, {{quote}}"
			)
			.addTextArea((text) => {
				text.inputEl.rows = 20;
				text.inputEl.cols = 50;
				text.inputEl.style.width = "100%";
				text.inputEl.style.fontFamily = "monospace";
				text.inputEl.style.fontSize = "12px";
				text
					.setPlaceholder("Enter your journal template...")
					.setValue(this.plugin.settings.templateContent)
					.onChange(async (value) => {
						this.plugin.settings.templateContent = value;
						await this.plugin.saveSettings();
					});
			});

		// Reset template with confirmation
		new Setting(containerEl)
			.setName("Reset template")
			.setDesc("Reset the template to the default journal template.")
			.addButton((button) =>
				button
					.setButtonText("Reset to default")
					.setWarning()
					.onClick(async () => {
						const confirmed = await this.showConfirmationModal(
							"Reset Template?",
							"This will replace your current template with the default. This action cannot be undone."
						);
						if (confirmed) {
							this.plugin.settings.templateContent = DEFAULT_SETTINGS.templateContent;
							await this.plugin.saveSettings();
							this.display();
							new Notice(SUCCESS_MESSAGES.TEMPLATE_RESET);
						}
					})
			);
	}

	/**
	 * Save settings with user feedback notice.
	 */
	private async saveWithFeedback(message: string = SUCCESS_MESSAGES.SETTINGS_SAVED): Promise<void> {
		await this.plugin.saveSettings();
		new Notice(message, 2000);
	}

	/**
	 * Check for invalid folder name characters.
	 */
	private isValidFolderName(name: string): boolean {
		return /^[^\\/:\\*\\?"<>|]+$/.test(name.trim());
	}

	/**
	 * Show a confirmation modal and return the result.
	 */
	private async showConfirmationModal(title: string, message: string): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText(title);
			modal.contentEl.createEl("p", { text: message });

			const buttonContainer = modal.contentEl.createDiv({ cls: "modal-button-container" });
			buttonContainer.style.display = "flex";
			buttonContainer.style.justifyContent = "flex-end";
			buttonContainer.style.gap = "8px";
			buttonContainer.style.marginTop = "16px";

			const cancelBtn = buttonContainer.createEl("button", { text: "Cancel" });
			cancelBtn.addEventListener("click", () => {
				modal.close();
				resolve(false);
			});

			const confirmBtn = buttonContainer.createEl("button", {
				text: "Reset",
				cls: "mod-warning",
			});
			confirmBtn.addEventListener("click", () => {
				modal.close();
				resolve(true);
			});

			modal.open();
		});
	}
}

/**
 * Modal for editing a custom template's name, icon, and content.
 */
class CustomTemplateEditorModal extends Modal {
	private template: CustomTemplate;
	private onSave: (template: CustomTemplate) => void;

	constructor(app: App, template: CustomTemplate, onSave: (template: CustomTemplate) => void) {
		super(app);
		this.template = { ...template };
		this.onSave = onSave;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Edit Template" });

		new Setting(contentEl)
			.setName("Name")
			.addText((text) =>
				text
					.setPlaceholder("Template name")
					.setValue(this.template.name)
					.onChange((value) => {
						this.template.name = value;
					})
			);

		new Setting(contentEl)
			.setName("Icon")
			.setDesc("Single emoji for the template card.")
			.addText((text) => {
				text.inputEl.style.width = "60px";
				text
					.setPlaceholder("📄")
					.setValue(this.template.icon)
					.onChange((value) => {
						this.template.icon = value;
					});
			});

		new Setting(contentEl)
			.setName("Content")
			.setDesc("Template content. Variables: {{date}}, {{time}}, {{dayOfWeek}}, {{year}}, {{month}}, {{monthName}}, {{day}}, {{quote}}")
			.addTextArea((text) => {
				text.inputEl.rows = 15;
				text.inputEl.style.width = "100%";
				text.inputEl.style.fontFamily = "monospace";
				text.inputEl.style.fontSize = "12px";
				text
					.setPlaceholder("Enter template content...")
					.setValue(this.template.content)
					.onChange((value) => {
						this.template.content = value;
					});
			});

		const buttonContainer = contentEl.createDiv({ cls: "modal-button-container" });
		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "flex-end";
		buttonContainer.style.gap = "8px";
		buttonContainer.style.marginTop = "16px";

		const cancelBtn = buttonContainer.createEl("button", { text: "Cancel" });
		cancelBtn.addEventListener("click", () => {
			this.close();
		});

		const saveBtn = buttonContainer.createEl("button", {
			text: "Save",
			cls: "mod-cta",
		});
		saveBtn.addEventListener("click", () => {
			this.onSave(this.template);
			this.close();
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
