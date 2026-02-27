# 📓 Daily Journal

A beautiful daily journal plugin for [Obsidian](https://obsidian.md). Create, organize, and manage your journal entries with customizable templates, mood tracking, writing streaks, and a built-in calendar view.

![Obsidian](https://img.shields.io/badge/Obsidian-v0.15.0+-7C3AED?style=for-the-badge&logo=obsidian&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-10B981?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

---

## ✨ Features

### 📝 Smart Journal Creation
- **One-click journal creation** — Create today's journal entry instantly via ribbon icon, command palette, or status bar click.
- **Date-based folder structure** — Entries are automatically organized as `Journal/YYYY/MM/date.md`.
- **Template variables** — Dynamic content with `{{date}}`, `{{time}}`, `{{dayOfWeek}}`, `{{year}}`, `{{month}}`, `{{monthName}}`, `{{day}}`, `{{quote}}`, `{{moon_phase}}`, `{{season}}`, `{{weather_emoji}}`, `{{week_number}}`, and `{{random_prompt}}`.
- **Create for any date** — Commands for today, yesterday, and tomorrow.

### 📄 Template System
- **5 built-in templates:**
  - 📝 **Full Journal** — Morning reflection, goals, notes, and evening review.
  - ✏️ **Minimal** — Clean, distraction-free layout.
  - 🙏 **Gratitude Journal** — Focus on gratitude and kindness.
  - 📋 **Bullet Journal** — Tasks, events, notes, and ideas.
  - 📆 **Weekly Review** — Wins, progress tracking, and energy levels.
- **Custom templates** — Create, edit, and delete your own templates with custom icons.
- **Template picker modal** — Choose a template before creating each entry (optional).
- **Template presets** — Quickly load built-in templates into the editor.

### 😊 Mood Tracker
- Pick your mood when creating a new journal entry.
- 5 mood levels: 😄 Great, 🙂 Good, 😐 Okay, 😔 Sad, 😡 Awful.
- Mood is stored in frontmatter and displayed on the calendar.
- Update mood anytime via the command palette.

### 🎭 Advanced Mood Tracking *(NEW in v2.0)*
- **Energy level** — Track Low/Medium/High energy alongside mood.
- **Stress slider** — Rate stress on a 1-10 scale.
- **Emotion tags** — Select multiple emotions per entry (grateful, anxious, calm, excited, etc.).
- **Mood triggers** — Log what influenced your mood (work, health, relationships, weather, etc.).
- **Multi-panel flow** — Progress through mood → energy → stress → emotions → triggers with skip options.
- Each dimension stored in frontmatter for analytics.

### 📅 Calendar View
- Beautiful interactive calendar in the right sidebar.
- **Visual indicators** — Days with journal entries are highlighted.
- **Mood dots** — See your mood emoji on each day at a glance.
- **Monthly stats** — Entry count and completion percentage.
- **Quick navigation** — Click any day to open or create its journal entry.
- Navigate between months with previous/next buttons and a "Today" shortcut.

### 🔥 Writing Streak
- **Current streak** — Consecutive days of journaling, shown in the status bar.
- **Longest streak** — Track your personal best.
- **Total entries & word count** — Available in the Journal Navigator.

### 🎯 Daily Word Goal
- Set a daily word count target (e.g. 300 words/day).
- **Status bar progress** — See `✍️ 234/500` live as you write.
- **Goal reached indicator** — Changes to `✅ 500/500` when you hit your target.
- Disable by setting goal to `0`.

### 📊 Writing Heatmap *(NEW in v2.0)*
- **GitHub-style activity grid** — 365-day writing history at a glance.
- **Color themes** — Green, blue, purple, or orange.
- **Click any day** — Jump to that journal entry.
- **Year stats** — Total entries count in the footer.

### 🏅 Achievement System *(NEW in v2.0)*
- **12 unlockable badges** — First Words, 3-Day Streak, Week Warrior, 30-Day Champion, 100-Day Legend, Wordsmith (1K words), Novelist (10K), Prolific Author (50K), Marathon Writer (100K), and more.
- **XP & Level system** — 6 levels from Beginner to Master Writer.
- **Badge gallery** — Visual badge collection in the Navigator.
- **Level progress bar** — See your XP progress.
- **Notifications** — Toast notifications when badges are unlocked.

### 💡 Smart Insights *(NEW in v2.0)*
- **Day-of-week patterns** — "You tend to feel best on Fridays."
- **Trigger correlations** — "Exercise days tend to boost your mood."
- **Weekly mood trends** — "You've been having a great week! 🌟"
- **Emotion frequency** — Most common emotion tracking.
- **Stress analysis** — Average stress level insights.

### 🤖 Smart Prompts *(NEW in v2.0)*
- **50 reflection prompts** — `{{random_prompt}}` in templates.
- **Moon phase** — `{{moon_phase}}` shows current lunar phase emoji.
- **Season tracking** — `{{season}}` and `{{weather_emoji}}`.
- **Week number** — `{{week_number}}` for ISO week.

### 📚 Journal Navigator
- Browse all journal entries in a searchable modal.
- **Live search** — Filter entries by content, filename, or mood (debounced).
- **Stats dashboard** — Total entries, word count, current streak, and best streak.
- **Entry previews** — See date, mood, word count, and a text preview for each entry.
- **Mood analytics** — 30-day mood grid and mood distribution chart.
- **Writing heatmap** — GitHub-style activity overview *(NEW in v2.0)*.
- **Badge gallery** — Achievement badges collection *(NEW in v2.0)*.
- **Level progress** — XP bar and current level *(NEW in v2.0)*.
- **Mood insights** — AI-generated text insights from your journal patterns *(NEW in v2.0)*.

### 💡 Daily Quotes
- A rotating collection of 50+ inspirational quotes.
- Automatically inserted via the `{{quote}}` variable in templates.
- Deterministic per day — the same quote appears all day.

### ⚙️ Highly Configurable
- Customizable journal folder path.
- Multiple date formats: `YYYY-MM-DD`, `DD-MM-YYYY`, `MM-DD-YYYY`, `YYYY/MM/DD`, `DD.MM.YYYY`.
- Toggle features on/off: mood tracker, daily quotes, streak counter, template picker.
- **Advanced Mood Tracking** — Toggle energy, stress, emotions, triggers independently *(NEW in v2.0)*.
- **Gamification** — Toggle achievements, heatmap, color themes *(NEW in v2.0)*.
- **Smart Features** — Toggle smart prompts, auto-tagging *(NEW in v2.0)*.
- **Daily word goal** — Set a writing target with status bar progress tracking.
- Open journal on Obsidian startup (optional).
- Show/hide ribbon icon.

---

## 🚀 Installation

### From Obsidian Community Plugins *(coming soon)*

1. Open **Settings** → **Community Plugins** → **Browse**.
2. Search for **"Daily Journal"**.
3. Click **Install**, then **Enable**.

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/LinhDangDev/Journal-Daily-Obsidian-Plugins/releases).
2. Create a folder: `<your-vault>/.obsidian/plugins/daily-journal/`.
3. Copy the downloaded files into that folder.
4. Open **Settings** → **Community Plugins** → Enable **"Daily Journal"**.

### Build from Source

```bash
# Clone the repository
git clone https://github.com/LinhDangDev/Journal-Daily-Obsidian-Plugins.git
cd Journal-Daily-Obsidian-Plugins

# Install dependencies
npm install

# Build
npm run build

# For development (watches for changes)
npm run dev
```

---

## 📖 Usage

### Creating a Journal Entry

1. **Ribbon icon** — Click the 📖 book icon in the left sidebar.
2. **Command palette** — Open the command palette (`Ctrl/Cmd + P`) and search for:
   - `Create today's journal`
   - `Create yesterday's journal`
   - `Create tomorrow's journal`
3. **Status bar** — Click the journal status indicator at the bottom.

### Available Commands

| Command | Description |
|---------|-------------|
| `Create today's journal` | Create or open today's journal entry |
| `Open today's journal` | Open today's journal entry |
| `Create yesterday's journal` | Create or open yesterday's entry |
| `Create tomorrow's journal` | Create or open tomorrow's entry |
| `Open journal calendar` | Open the calendar view in the sidebar |
| `Browse all journal entries` | Open the Journal Navigator |
| `Set mood for today's journal` | Update today's mood |

### Template Variables

Use these variables in your templates — they are automatically replaced when a new entry is created:

| Variable | Example Output |
|----------|---------------|
| `{{date}}` | `2026-02-27` |
| `{{time}}` | `14:30` |
| `{{dayOfWeek}}` | `Thursday` |
| `{{year}}` | `2026` |
| `{{month}}` | `02` |
| `{{monthName}}` | `February` |
| `{{day}}` | `27` |
| `{{quote}}` | *An inspirational quote* |
| `{{moon_phase}}` | 🌓 *(current lunar phase)* |
| `{{season}}` | `Spring` |
| `{{weather_emoji}}` | 🌸 *(seasonal emoji)* |
| `{{week_number}}` | `9` *(ISO week)* |
| `{{random_prompt}}` | *A reflection prompt* |

### Folder Structure

Entries are organized automatically:

```
Journal/
├── 2026/
│   ├── 01/
│   │   ├── 2026-01-01.md
│   │   ├── 2026-01-02.md
│   │   └── ...
│   ├── 02/
│   │   ├── 2026-02-01.md
│   │   └── ...
│   └── ...
└── ...
```

---

## 🛠 Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [npm](https://www.npmjs.com/)

### Setup

```bash
git clone https://github.com/LinhDangDev/Journal-Daily-Obsidian-Plugins.git
cd Journal-Daily-Obsidian-Plugins
npm install
```

### Development Build

```bash
npm run dev
```

This watches for file changes and automatically rebuilds `main.js`.

### Production Build

```bash
npm run build
```

### Lint & Test

```bash
npm run lint        # ESLint check
npm run lint:fix    # ESLint auto-fix
npm run format      # Prettier format
npm test            # Run Vitest unit tests
npm run test:watch  # Watch mode
```

### Project Structure

```
src/
├── main.ts                  # Plugin entry point, commands, and lifecycle
├── settings.ts              # Settings UI, template presets, and data types
├── journal-creator.ts       # Journal file creation and template rendering
├── calendar-view.ts         # Calendar sidebar view with mood dots
├── journal-navigator.ts     # Searchable journal browser with stats + analytics
├── mood-modal.ts            # Simple mood picker modal
├── extended-mood-modal.ts   # Multi-panel mood picker (energy/stress/emotions/triggers)
├── template-picker.ts       # Template picker modal
├── streak-tracker.ts        # Writing streak calculator
├── mood-analytics.ts        # Mood analytics engine (insights, correlations)
├── writing-heatmap.ts       # GitHub-style writing activity heatmap
├── achievements.ts          # Badge & XP achievement system
├── smart-prompts.ts         # Smart prompt generators (moon, season, prompts)
├── constants/
│   ├── messages.ts          # Centralized UI messages
│   ├── emotions.ts          # Emotion tags, triggers, energy options
│   ├── prompts.ts           # Reflection & gratitude prompt pools
│   └── topics.ts            # Topic keywords for auto-tagging
├── utils/
│   └── date-formatter.ts    # Date formatting utilities
├── __tests__/
│   └── streak-tracker.test.ts  # StreakTracker unit tests
└── utils/__tests__/
    └── date-formatter.test.ts  # DateFormatter unit tests
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository.
2. **Create a branch** for your feature: `git checkout -b feature/my-feature`.
3. **Commit** your changes: `git commit -m 'feat: add my feature'`.
4. **Push** to the branch: `git push origin feature/my-feature`.
5. Open a **Pull Request**.

### Guidelines

- Follow the existing code style (TypeScript, no ESLint warnings).
- Test your changes in Obsidian before submitting.
- Write clear commit messages using [Conventional Commits](https://www.conventionalcommits.org/).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

© 2026 Đặng Duy Linh

---

## 🙏 Acknowledgments

- Built with the [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin).
- Inspired by the daily journaling community.

---

<p align="center">
  Made with ❤️ for the Obsidian community
</p>
