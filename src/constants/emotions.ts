/**
 * Predefined emotion tags for multi-dimensional mood tracking.
 */
export const EMOTION_TAGS: string[] = [
	"grateful",
	"excited",
	"calm",
	"hopeful",
	"proud",
	"inspired",
	"content",
	"anxious",
	"frustrated",
	"lonely",
	"overwhelmed",
	"nostalgic",
	"bored",
	"confused",
	"peaceful",
	"determined",
];

/**
 * Predefined trigger categories for mood tracking.
 */
export const TRIGGER_CATEGORIES: Array<{ id: string; label: string; icon: string }> = [
	{ id: "work", label: "Work", icon: "💼" },
	{ id: "relationships", label: "Relationships", icon: "❤️" },
	{ id: "health", label: "Health", icon: "🏥" },
	{ id: "exercise", label: "Exercise", icon: "🏃" },
	{ id: "sleep", label: "Sleep", icon: "😴" },
	{ id: "weather", label: "Weather", icon: "🌤️" },
	{ id: "social", label: "Social", icon: "👥" },
	{ id: "creative", label: "Creative", icon: "🎨" },
	{ id: "finance", label: "Finance", icon: "💰" },
	{ id: "family", label: "Family", icon: "👨‍👩‍👧" },
	{ id: "learning", label: "Learning", icon: "📚" },
	{ id: "nature", label: "Nature", icon: "🌿" },
];

export type EnergyLevel = "low" | "medium" | "high";

export const ENERGY_OPTIONS: Array<{ level: EnergyLevel; label: string; icon: string }> = [
	{ level: "low", label: "Low", icon: "🔋" },
	{ level: "medium", label: "Medium", icon: "⚡" },
	{ level: "high", label: "High", icon: "🔥" },
];
