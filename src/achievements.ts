import type { App } from "obsidian";
import { Notice } from "obsidian";
import type { JournalPluginSettings } from "./settings";
import type { StreakStats } from "./streak-tracker";

// ─── Badge Definitions ───

export interface BadgeDefinition {
	id: string;
	name: string;
	icon: string;
	description: string;
	condition: (ctx: AchievementContext) => boolean;
}

export interface UnlockedBadge {
	id: string;
	unlockedAt: string;
}

export interface AchievementContext {
	stats: StreakStats;
	totalDays: number;
}

export interface AchievementData {
	unlockedBadges: UnlockedBadge[];
	xp: number;
	level: number;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
	{
		id: "first-words",
		name: "First Words",
		icon: "✍️",
		description: "Write your first entry",
		condition: (ctx) => ctx.stats.totalEntries >= 1,
	},
	{
		id: "three-day-streak",
		name: "3-Day Streak",
		icon: "🔥",
		description: "Write 3 days in a row",
		condition: (ctx) => ctx.stats.longestStreak >= 3,
	},
	{
		id: "week-warrior",
		name: "Week Warrior",
		icon: "⚡",
		description: "7-day writing streak",
		condition: (ctx) => ctx.stats.longestStreak >= 7,
	},
	{
		id: "30-day-champion",
		name: "30-Day Champion",
		icon: "🏆",
		description: "30 consecutive days",
		condition: (ctx) => ctx.stats.longestStreak >= 30,
	},
	{
		id: "100-day-legend",
		name: "100-Day Legend",
		icon: "👑",
		description: "100 consecutive days",
		condition: (ctx) => ctx.stats.longestStreak >= 100,
	},
	{
		id: "wordsmith",
		name: "Wordsmith",
		icon: "📝",
		description: "Write 1,000 total words",
		condition: (ctx) => ctx.stats.totalWords >= 1000,
	},
	{
		id: "novelist",
		name: "Novelist",
		icon: "📖",
		description: "Write 10,000 total words",
		condition: (ctx) => ctx.stats.totalWords >= 10000,
	},
	{
		id: "prolific-author",
		name: "Prolific Author",
		icon: "📚",
		description: "Write 50,000 total words",
		condition: (ctx) => ctx.stats.totalWords >= 50000,
	},
	{
		id: "marathon-writer",
		name: "Marathon Writer",
		icon: "🏅",
		description: "Write 100,000 total words",
		condition: (ctx) => ctx.stats.totalWords >= 100000,
	},
	{
		id: "ten-entries",
		name: "Getting Started",
		icon: "🌱",
		description: "Write 10 entries",
		condition: (ctx) => ctx.stats.totalEntries >= 10,
	},
	{
		id: "fifty-entries",
		name: "Dedicated",
		icon: "💪",
		description: "Write 50 entries",
		condition: (ctx) => ctx.stats.totalEntries >= 50,
	},
	{
		id: "hundred-entries",
		name: "Centurion",
		icon: "💯",
		description: "Write 100 entries",
		condition: (ctx) => ctx.stats.totalEntries >= 100,
	},
];

// ─── Level System ───

export interface LevelDefinition {
	level: number;
	name: string;
	minXP: number;
}

export const LEVEL_DEFINITIONS: LevelDefinition[] = [
	{ level: 1, name: "Beginner", minXP: 0 },
	{ level: 2, name: "Regular", minXP: 100 },
	{ level: 3, name: "Dedicated", minXP: 500 },
	{ level: 4, name: "Writer", minXP: 1500 },
	{ level: 5, name: "Author", minXP: 5000 },
	{ level: 6, name: "Master Writer", minXP: 15000 },
];

export const XP_REWARDS = {
	WRITE_ENTRY: 10,
	MEET_GOAL: 20,
	STREAK_BONUS: 5,
	UNLOCK_BADGE: 50,
} as const;

// ─── Achievement Tracker ───

export class AchievementTracker {
	private settings: JournalPluginSettings;
	private data: AchievementData;
	private dataKey = "journal-achievements";

	constructor(_app: App, settings: JournalPluginSettings) {
		this.settings = settings;
		this.data = { unlockedBadges: [], xp: 0, level: 1 };
	}

	updateSettings(settings: JournalPluginSettings): void {
		this.settings = settings;
	}

	async loadData(pluginLoadData: () => Promise<unknown>): Promise<void> {
		const raw = await pluginLoadData();
		if (raw && typeof raw === "object" && this.dataKey in (raw as Record<string, unknown>)) {
			const stored = (raw as Record<string, unknown>)[this.dataKey];
			if (stored && typeof stored === "object") {
				const s = stored as Record<string, unknown>;
				this.data = {
					unlockedBadges: Array.isArray(s["unlockedBadges"]) ? s["unlockedBadges"] : [],
					xp: typeof s["xp"] === "number" ? s["xp"] : 0,
					level: typeof s["level"] === "number" ? s["level"] : 1,
				};
			}
		}
	}

	async saveData(
		pluginLoadData: () => Promise<unknown>,
		pluginSaveData: (data: unknown) => Promise<void>,
	): Promise<void> {
		const existing = (await pluginLoadData()) ?? {};
		const updated = { ...(existing as Record<string, unknown>), [this.dataKey]: this.data };
		await pluginSaveData(updated);
	}

	getData(): AchievementData {
		return this.data;
	}

	getLevel(): LevelDefinition {
		const fallback: LevelDefinition = { level: 1, name: "Beginner", minXP: 0 };
		for (let i = LEVEL_DEFINITIONS.length - 1; i >= 0; i--) {
			const def = LEVEL_DEFINITIONS[i];
			if (def && this.data.xp >= def.minXP) return def;
		}
		return fallback;
	}

	getNextLevel(): LevelDefinition | null {
		const current = this.getLevel();
		const next = LEVEL_DEFINITIONS.find((l) => l.minXP > current.minXP);
		return next ?? null;
	}

	getXPProgress(): { current: number; nextThreshold: number; percentage: number } {
		const next = this.getNextLevel();
		if (!next) return { current: this.data.xp, nextThreshold: this.data.xp, percentage: 100 };
		const currentLevel = this.getLevel();
		const range = next.minXP - currentLevel.minXP;
		const progress = this.data.xp - currentLevel.minXP;
		return {
			current: this.data.xp,
			nextThreshold: next.minXP,
			percentage: Math.min(100, Math.round((progress / range) * 100)),
		};
	}

	/**
	 * Award XP and check for level-up.
	 */
	addXP(amount: number): boolean {
		const prevLevel = this.getLevel().level;
		this.data.xp += amount;
		this.data.level = this.getLevel().level;
		return this.data.level > prevLevel;
	}

	/**
	 * Check and unlock badges based on current stats.
	 * Returns list of newly unlocked badges.
	 */
	checkBadges(stats: StreakStats): BadgeDefinition[] {
		if (!this.settings.enableAchievements) return [];

		const ctx: AchievementContext = {
			stats,
			totalDays: stats.totalEntries,
		};

		const newBadges: BadgeDefinition[] = [];
		const unlockedIds = new Set(this.data.unlockedBadges.map((b) => b.id));

		for (const badge of BADGE_DEFINITIONS) {
			if (!unlockedIds.has(badge.id) && badge.condition(ctx)) {
				this.data.unlockedBadges.push({
					id: badge.id,
					unlockedAt: new Date().toISOString(),
				});
				newBadges.push(badge);
				this.addXP(XP_REWARDS.UNLOCK_BADGE);
			}
		}

		return newBadges;
	}

	/**
	 * Announce newly unlocked badges.
	 */
	announceNewBadges(badges: BadgeDefinition[]): void {
		for (const badge of badges) {
			new Notice(`🎉 Badge Unlocked: ${badge.icon} ${badge.name}!\n${badge.description}`, 5000);
		}
	}

	/**
	 * Render badge gallery into container.
	 */
	renderBadgeGallery(container: HTMLElement): void {
		const section = container.createDiv({ cls: "journal-achievements" });
		section.createEl("h3", { text: "🏅 Achievements" });

		const grid = section.createDiv({ cls: "journal-achievements-grid" });
		const unlockedIds = new Set(this.data.unlockedBadges.map((b) => b.id));

		for (const badge of BADGE_DEFINITIONS) {
			const isLocked = !unlockedIds.has(badge.id);
			const card = grid.createDiv({ cls: "journal-badge" });
			if (isLocked) card.addClass("is-locked");

			card.createDiv({ cls: "journal-badge-icon", text: isLocked ? "❓" : badge.icon });
			card.createDiv({ cls: "journal-badge-name", text: badge.name });
			card.title = isLocked ? "???" : badge.description;
		}
	}

	/**
	 * Render level/XP bar into container.
	 */
	renderLevelBar(container: HTMLElement): void {
		const level = this.getLevel();
		const progress = this.getXPProgress();

		const section = container.createDiv({ cls: "journal-level-bar" });
		const header = section.createDiv({ cls: "journal-level-header" });
		header.createDiv({
			cls: "journal-level-title",
			text: `✨ Level ${level.level}: ${level.name}`,
		});
		header.createDiv({
			cls: "journal-level-xp",
			text: `${progress.current} / ${progress.nextThreshold} XP`,
		});

		const bar = section.createDiv({ cls: "journal-xp-bar" });
		const fill = bar.createDiv({ cls: "journal-xp-fill" });
		fill.style.width = `${progress.percentage}%`;
	}
}
