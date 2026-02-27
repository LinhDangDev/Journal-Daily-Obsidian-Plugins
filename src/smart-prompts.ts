import {
	REFLECTION_PROMPTS,
	GRATITUDE_PROMPTS,
	MINDFULNESS_PROMPTS,
} from "./constants/prompts";

/**
 * Generates context-aware writing prompts based on journal data patterns.
 */
export class SmartPrompts {

	/**
	 * Get a random reflection prompt.
	 */
	getRandomPrompt(): string {
		const idx = Math.floor(Math.random() * REFLECTION_PROMPTS.length);
		return REFLECTION_PROMPTS[idx] ?? REFLECTION_PROMPTS[0] ?? "What's on your mind today?";
	}

	/**
	 * Get a random gratitude prompt.
	 */
	getGratitudePrompt(): string {
		const idx = Math.floor(Math.random() * GRATITUDE_PROMPTS.length);
		return GRATITUDE_PROMPTS[idx] ?? GRATITUDE_PROMPTS[0] ?? "What are you grateful for?";
	}

	/**
	 * Get a random mindfulness prompt for pre-writing.
	 */
	getMindfulnessPrompt(): string {
		const idx = Math.floor(Math.random() * MINDFULNESS_PROMPTS.length);
		return MINDFULNESS_PROMPTS[idx] ?? MINDFULNESS_PROMPTS[0] ?? "Take a deep breath.";
	}

	/**
	 * Get moon phase emoji for current date.
	 * Uses a known new moon date and 29.53-day cycle.
	 */
	static getMoonPhase(date: Date = new Date()): string {
		// Known new moon: Jan 6, 2000
		const knownNewMoon = new Date(2000, 0, 6, 18, 14, 0);
		const lunarCycle = 29.53058867;

		const diff = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
		const age = ((diff % lunarCycle) + lunarCycle) % lunarCycle;

		const phases = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
		const phaseIndex = Math.floor((age / lunarCycle) * 8) % 8;
		return phases[phaseIndex] ?? "🌑";
	}

	/**
	 * Get season name from date.
	 */
	static getSeason(date: Date = new Date()): string {
		const month = date.getMonth(); // 0-11
		if (month >= 2 && month <= 4) return "Spring";
		if (month >= 5 && month <= 7) return "Summer";
		if (month >= 8 && month <= 10) return "Fall";
		return "Winter";
	}

	/**
	 * Get season emoji.
	 */
	static getSeasonEmoji(date: Date = new Date()): string {
		const season = SmartPrompts.getSeason(date);
		switch (season) {
			case "Spring":
				return "🌸";
			case "Summer":
				return "☀️";
			case "Fall":
				return "🍂";
			case "Winter":
				return "❄️";
			default:
				return "🌍";
		}
	}

	/**
	 * Get ISO week number.
	 */
	static getWeekNumber(date: Date = new Date()): number {
		const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
		const dayNum = d.getUTCDay() || 7;
		d.setUTCDate(d.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
		return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	}
}
