import { App, TFile, TFolder, normalizePath } from "obsidian";
import type { JournalPluginSettings } from "./settings";
import { DateFormatter } from "./utils/date-formatter";
import { SmartPrompts } from "./smart-prompts";
import { REFLECTION_PROMPTS } from "./constants/prompts";

const DAYS_OF_WEEK_EN = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

const MONTHS_EN = [
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

const DAILY_QUOTES: string[] = [
	"The only way to do great work is to love what you do. — Steve Jobs",
	"In the middle of difficulty lies opportunity. — Albert Einstein",
	"The journey of a thousand miles begins with one step. — Lao Tzu",
	"What lies behind us and what lies before us are tiny matters compared to what lies within us. — Ralph Waldo Emerson",
	"Not all those who wander are lost. — J.R.R. Tolkien",
	"The best time to plant a tree was 20 years ago. The second best time is now. — Chinese Proverb",
	"It is during our darkest moments that we must focus to see the light. — Aristotle",
	"Life is what happens when you're busy making other plans. — John Lennon",
	"The purpose of our lives is to be happy. — Dalai Lama",
	"You must be the change you wish to see in the world. — Mahatma Gandhi",
	"Write it on your heart that every day is the best day in the year. — Ralph Waldo Emerson",
	"Happiness is not something ready made. It comes from your own actions. — Dalai Lama",
	"Turn your wounds into wisdom. — Oprah Winfrey",
	"The only impossible journey is the one you never begin. — Tony Robbins",
	"Everything you've ever wanted is on the other side of fear. — George Addair",
	"Keep your face always toward the sunshine — and shadows will fall behind you. — Walt Whitman",
	"The mind is everything. What you think you become. — Buddha",
	"An unexamined life is not worth living. — Socrates",
	"We are what we repeatedly do. Excellence, then, is not an act, but a habit. — Aristotle",
	"Do what you can, with what you have, where you are. — Theodore Roosevelt",
	"Believe you can and you're halfway there. — Theodore Roosevelt",
	"The only limit to our realization of tomorrow is our doubts of today. — Franklin D. Roosevelt",
	"It does not matter how slowly you go as long as you do not stop. — Confucius",
	"Act as if what you do makes a difference. It does. — William James",
	"Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill",
	"What we think, we become. — Buddha",
	"Life isn't about finding yourself. Life is about creating yourself. — George Bernard Shaw",
	"The biggest adventure you can take is to live the life of your dreams. — Oprah Winfrey",
	"Start where you are. Use what you have. Do what you can. — Arthur Ashe",
	"Every moment is a fresh beginning. — T.S. Eliot",
	"Be yourself; everyone else is already taken. — Oscar Wilde",
	"If you want to lift yourself up, lift up someone else. — Booker T. Washington",
	"I have not failed. I've just found 10,000 ways that won't work. — Thomas Edison",
	"A person who never made a mistake never tried anything new. — Albert Einstein",
	"You miss 100% of the shots you don't take. — Wayne Gretzky",
	"The best revenge is massive success. — Frank Sinatra",
	"Your time is limited, so don't waste it living someone else's life. — Steve Jobs",
	"Whether you think you can or you think you can't, you're right. — Henry Ford",
	"I think, therefore I am. — René Descartes",
	"The unexamined life is not worth living. — Socrates",
	"To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment. — Ralph Waldo Emerson",
	"In three words I can sum up everything I've learned about life: it goes on. — Robert Frost",
	"Dream big and dare to fail. — Norman Vaughan",
	"Life is either a daring adventure or nothing at all. — Helen Keller",
	"Tell me and I forget. Teach me and I remember. Involve me and I learn. — Benjamin Franklin",
	"It always seems impossible until it's done. — Nelson Mandela",
	"The way to get started is to quit talking and begin doing. — Walt Disney",
	"Don't count the days, make the days count. — Muhammad Ali",
	"Yesterday is history, tomorrow is a mystery, today is a gift — that's why it's called the present. — Eleanor Roosevelt",
	"You only live once, but if you do it right, once is enough. — Mae West",
];

export class JournalCreator {
	private app: App;
	private settings: JournalPluginSettings;

	constructor(app: App, settings: JournalPluginSettings) {
		this.app = app;
		this.settings = settings;
	}

	updateSettings(settings: JournalPluginSettings): void {
		this.settings = settings;
	}

	async createOrOpen(date: Date, templateContent?: string): Promise<TFile> {
		const filePath = this.getJournalPath(date);
		const existingFile = this.app.vault.getAbstractFileByPath(filePath);

		if (existingFile instanceof TFile) {
			return existingFile;
		}

		await this.ensureFolderExists(filePath);
		const content = this.generateContent(date, templateContent);
		const file = await this.app.vault.create(filePath, content);
		return file;
	}

	/**
	 * Update the mood in a journal entry's frontmatter.
	 * Handles both updating existing mood and adding new mood field.
	 */
	async updateMood(file: TFile, moodText: string): Promise<void> {
		try {
			const content = await this.app.vault.read(file);

			// Try to update existing mood field
			let updated = content.replace(
				/^(---[\s\S]*?)(mood:\s*"[^"]*")([\s\S]*?---)/m,
				`$1mood: "${moodText}"$3`,
			);

			// If no mood field exists, add it after date
			if (updated === content) {
				updated = content.replace(/(date:\s*"[^"]*")/, `$1\nmood: "${moodText}"`);
			}

			// If still no change (no frontmatter?), insert mood at top
			if (updated === content && content.startsWith("---")) {
				updated = content.replace(/^(---\n)/, `$1mood: "${moodText}"\n`);
			}

			if (updated === content) {
				throw new Error("Could not update mood in frontmatter");
			}

			await this.app.vault.modify(file, updated);
		} catch (error) {
			if (error instanceof Error && error.message.includes("does not exist")) {
				throw new Error("Journal entry was deleted before mood update", { cause: error });
			}
			throw error;
		}
	}

	/**
	 * Update extended mood data in frontmatter (energy, stress, emotions, triggers).
	 */
	async updateExtendedMood(
		file: TFile,
		data: {
			energy?: string | null;
			stress?: number | null;
			emotions?: string[];
			triggers?: string[];
		},
	): Promise<void> {
		try {
			let content = await this.app.vault.read(file);

			// Helper: set or add a simple key-value frontmatter field
			const setField = (key: string, value: string) => {
				const regex = new RegExp(
					`^(---[\\s\\S]*?)(${key}:\\s*(?:"[^"]*"|\\S+))([\\s\\S]*?---)`,
					"m",
				);
				if (regex.test(content)) {
					content = content.replace(regex, `$1${key}: ${value}$3`);
				} else {
					// Add after mood field, or after date field, or at top of frontmatter
					if (content.includes("mood:")) {
						content = content.replace(/(mood:\s*"[^"]*")/, `$1\n${key}: ${value}`);
					} else if (content.includes("date:")) {
						content = content.replace(/(date:\s*"[^"]*")/, `$1\n${key}: ${value}`);
					} else if (content.startsWith("---")) {
						content = content.replace(/^(---\n)/, `$1${key}: ${value}\n`);
					}
				}
			};

			// Helper: set or add an array frontmatter field
			const setArrayField = (key: string, values: string[]) => {
				const arrayStr =
					values.length > 0 ? `[${values.join(", ")}]` : "[]";

				// Remove existing array field (handles multi-line YAML arrays too)
				const inlineRegex = new RegExp(
					`^(---[\\s\\S]*?)(${key}:\\s*\\[[^\\]]*\\])([\\s\\S]*?---)`,
					"m",
				);
				if (inlineRegex.test(content)) {
					content = content.replace(inlineRegex, `$1${key}: ${arrayStr}$3`);
				} else {
					// Add the field
					if (content.includes("mood:")) {
						content = content.replace(
							/(mood:\s*"[^"]*")/,
							`$1\n${key}: ${arrayStr}`,
						);
					} else if (content.startsWith("---")) {
						content = content.replace(/^(---\n)/, `$1${key}: ${arrayStr}\n`);
					}
				}
			};

			if (data.energy !== undefined && data.energy !== null) {
				setField("energy", `"${data.energy}"`);
			}
			if (data.stress !== undefined && data.stress !== null) {
				setField("stress", String(data.stress));
			}
			if (data.emotions !== undefined && data.emotions.length > 0) {
				setArrayField("emotions", data.emotions);
			}
			if (data.triggers !== undefined && data.triggers.length > 0) {
				setArrayField("triggers", data.triggers);
			}

			await this.app.vault.modify(file, content);
		} catch (error) {
			if (error instanceof Error && error.message.includes("does not exist")) {
				throw new Error("Journal entry was deleted before mood update", { cause: error });
			}
			throw error;
		}
	}

	exists(date: Date): boolean {
		const filePath = this.getJournalPath(date);
		const file = this.app.vault.getAbstractFileByPath(filePath);
		return file instanceof TFile;
	}

	getJournalPath(date: Date): string {
		const year = date.getFullYear().toString();
		const month = DateFormatter.padZero(date.getMonth() + 1);
		const formattedDate = DateFormatter.formatDate(date, this.settings.dateFormat);

		return normalizePath(`${this.settings.journalFolder}/${year}/${month}/${formattedDate}.md`);
	}

	generateContent(date: Date, templateContent?: string): string {
		const year = date.getFullYear().toString();
		const month = DateFormatter.padZero(date.getMonth() + 1);
		const day = DateFormatter.padZero(date.getDate());
		const dayOfWeek = DAYS_OF_WEEK_EN[date.getDay()] ?? "Unknown";
		const monthName = MONTHS_EN[date.getMonth()] ?? "Unknown";
		const formattedDate = DateFormatter.formatDate(date, this.settings.dateFormat);

		const hours = DateFormatter.padZero(date.getHours());
		const minutes = DateFormatter.padZero(date.getMinutes());
		const time = `${hours}:${minutes}`;

		const quote = this.getDailyQuote(date);

		let content = templateContent ?? this.settings.templateContent;

		const replacements: Record<string, string> = {
			"{{date}}": formattedDate,
			"{{time}}": time,
			"{{dayOfWeek}}": dayOfWeek,
			"{{year}}": year,
			"{{month}}": month,
			"{{monthName}}": monthName,
			"{{day}}": day,
			"{{quote}}": quote,
			// Phase 5: Expanded template variables
			"{{moon_phase}}": SmartPrompts.getMoonPhase(date),
			"{{weather_emoji}}": SmartPrompts.getSeasonEmoji(date),
			"{{season}}": SmartPrompts.getSeason(date),
			"{{week_number}}": String(SmartPrompts.getWeekNumber(date)),
			"{{random_prompt}}": REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)] ?? "What's on your mind?",
		};

		for (const [variable, value] of Object.entries(replacements)) {
			content = content.split(variable).join(value);
		}

		return content;
	}

	async getWordCount(date: Date): Promise<number> {
		const filePath = this.getJournalPath(date);
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return 0;

		const content = await this.app.vault.cachedRead(file);
		const noFrontmatter = content.replace(/^---[\s\S]*?---\n?/, "");
		return noFrontmatter
			.trim()
			.split(/\s+/)
			.filter((w) => w.length > 0).length;
	}


	private getDailyQuote(date: Date): string {
		const dayOfYear = Math.floor(
			(date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24),
		);
		const index = dayOfYear % DAILY_QUOTES.length;
		return DAILY_QUOTES[index] ?? DAILY_QUOTES[0] ?? "";
	}

	private async ensureFolderExists(filePath: string): Promise<void> {
		const parts = filePath.split("/");
		parts.pop();
		const folderPath = parts.join("/");

		if (!folderPath) return;

		const existingFolder = this.app.vault.getAbstractFileByPath(folderPath);
		if (existingFolder instanceof TFolder) {
			return;
		}

		await this.app.vault.createFolder(folderPath).catch((err: unknown) => {
			if (err instanceof Error && !err.message.includes("Folder already exists")) {
				throw err;
			}
		});
	}
}
