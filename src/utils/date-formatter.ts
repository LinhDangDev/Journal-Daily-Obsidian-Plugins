/**
 * Centralized date formatting utility.
 * Deduplicates date formatting logic across the plugin.
 */
export class DateFormatter {
	static formatDate(date: Date, format: string): string {
		const year = date.getFullYear().toString();
		const month = DateFormatter.padZero(date.getMonth() + 1);
		const day = DateFormatter.padZero(date.getDate());

		return format
			.replace("YYYY", year)
			.replace("MM", month)
			.replace("DD", day);
	}

	static padZero(num: number): string {
		return num < 10 ? `0${num}` : `${num}`;
	}

	/**
	 * Parse a formatted date string back to YYYY-MM-DD based on the format.
	 */
	static parseFromFormat(dateStr: string, format: string): string | null {
		try {
			const yearIdx = format.indexOf("YYYY");
			const monthIdx = format.indexOf("MM");
			const dayIdx = format.indexOf("DD");

			if (yearIdx === -1 || monthIdx === -1 || dayIdx === -1) {
				return null;
			}

			const year = dateStr.substring(yearIdx, yearIdx + 4);
			const month = dateStr.substring(monthIdx, monthIdx + 2);
			const day = dateStr.substring(dayIdx, dayIdx + 2);

			if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
				return null;
			}

			return `${year}-${month}-${day}`;
		} catch {
			return null;
		}
	}

	/**
	 * Parse a YYYY-MM-DD string to a Date object.
	 */
	static parseSimpleDate(dateStr: string): Date | null {
		const parts = dateStr.split("-");
		if (parts.length !== 3) return null;
		const [yearStr, monthStr, dayStr] = parts;
		if (!yearStr || !monthStr || !dayStr) return null;

		const year = parseInt(yearStr, 10);
		const month = parseInt(monthStr, 10) - 1;
		const day = parseInt(dayStr, 10);

		if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
		return new Date(year, month, day);
	}
}
