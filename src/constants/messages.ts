export const ERROR_MESSAGES = {
	JOURNAL_CREATE_FAILED: "❌ Failed to create journal entry. Check console for details.",
	JOURNAL_OPEN_FAILED: "❌ Failed to open journal entry.",
	JOURNAL_NOT_FOUND: "📓 No journal entry found. Create one first!",
	MOOD_UPDATE_FAILED: "❌ Failed to update mood. Try again.",
	CALENDAR_INIT_FAILED: "❌ Calendar view failed to initialize.",
	FILE_DELETED: "❌ Journal entry was deleted.",
	INVALID_FOLDER_NAME: "❌ Folder name contains invalid characters.",
	INVALID_DATE_FORMAT: "❌ Invalid date format. Must contain YYYY, MM, and DD.",
} as const;

export const SUCCESS_MESSAGES = {
	JOURNAL_CREATED: "📓 New journal entry created!",
	JOURNAL_OPENED: "📓 Journal entry opened.",
	MOOD_SET: (mood: string) => `Mood set: ${mood}`,
	MOOD_UPDATED: (mood: string) => `Mood updated: ${mood}`,
	SETTINGS_SAVED: "✅ Settings saved",
	TEMPLATE_RESET: "✅ Template reset to default",
	CREATING_ENTRY: "Creating journal entry...",
} as const;
