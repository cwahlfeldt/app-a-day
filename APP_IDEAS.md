# App Ideas

Micro-utilities in the same spirit: local-only, no accounts, solve one small problem well.

---

## Time & Date Calculators

**Return Window Tracker**
Enter order date and return window (e.g., 30 days). Shows final return date with ICS reminder export. Useful for online shopping where return policies vary.

**Refill Reminder**
Enter prescription/supply fill date and days of supply. Calculates reorder date accounting for pharmacy lead time. ICS export for calendar.

**Age in Days**
Enter a birthdate, see age in days, weeks, months, years. Shows upcoming milestones (10,000 days, next birthday). Fun for parents tracking kids or personal curiosity.

**Meeting Time Zone Converter**
Enter a meeting time and select 2-4 time zones. Shows the time in each zone with day-of-week if it crosses midnight. Copyable summary for pasting into invites.

**Countdown Builder**
Enter an event name and date. Generates a shareable countdown page (as a data URL or copyable HTML snippet) showing days/hours remaining.

---

## Splitting & Dividing

**Tip & Split Calculator**
Enter bill amount, tip percentage, number of people. Shows per-person total. Option to round up to nearest dollar. Handles uneven splits (e.g., "Alex pays $5 more").

**Grocery Split**
Paste a receipt or itemized list. Assign items to people. Calculates who owes what including tax proportionally distributed.

**Time Block Divider**
Enter total available time and list of tasks. Distributes time proportionally or equally. Outputs a schedule with start/end times.

---

## Text & Content Tools

**Word/Character Counter**
Paste text, see word count, character count (with/without spaces), sentence count, paragraph count, reading time estimate. Highlights if over common limits (Twitter, meta descriptions).

**Lorem Generator**
Generate placeholder text by paragraph, sentence, or word count. Options for different flavors (standard lorem, hipster ipsum style, plain English).

**Slug Generator**
Enter a title, get a URL-friendly slug. Options for separator (dash, underscore), max length, removing stop words. Shows multiple variants.

**QR Code Generator**
Enter text or URL, generate a QR code. Download as PNG or SVG. No tracking, generated entirely client-side.

**Markdown Table Builder**
Enter rows and columns, fill in cells, get formatted markdown table. Handles alignment options. Paste TSV to convert.

---

## Personal Finance Helpers

**Hourly to Salary Converter**
Enter hourly rate, see annual salary (and vice versa). Accounts for hours/week and weeks/year. Shows monthly and biweekly equivalents.

**Savings Goal Tracker**
Enter goal amount and target date. Shows how much to save per week/month. Option to enter current savings and adjust.

**Bill Due Date Calendar**
Enter recurring bills with due dates. Generates a monthly view or ICS file with all bills. Local storage remembers entries.

---

## Event & Coordination

**Potluck Planner**
Enter number of guests. Suggests how many of each category (mains, sides, desserts, drinks). Generates a sign-up list to copy/share.

**Gift Exchange Matcher**
Enter names, generate secret santa assignments. Option to add exclusions (couples shouldn't draw each other). Results shown one at a time to preserve secrecy.

**RSVP Collector**
Create a simple yes/no/maybe poll with a question. Generates a unique link (using URL hash for state). Responses stored in URL, no backend needed.

**Packing List Generator**
Select trip type (beach, camping, business) and duration. Generates a checklist. Checkboxes persist in local storage for that trip.

---

## Health & Wellness

**Water Intake Tracker**
Set daily goal. Tap to log glasses/bottles. Shows progress bar. Resets daily. History stored locally.

**Sleep Calculator**
Enter when you need to wake up. Shows optimal bedtimes based on 90-minute sleep cycles. Or enter when you're going to bed, see best wake times.

**Medication Reminder Builder**
Enter medication name and schedule. Generates ICS file with recurring reminders. Handles complex schedules (every 8 hours, twice daily with food).

---

## Developer & Technical

**JSON Formatter**
Paste JSON, see it pretty-printed with syntax highlighting. Collapse/expand nodes. Copy formatted version. Validate and show errors inline.

**Base64 Encoder/Decoder**
Enter text or paste base64. Toggle between encoded and decoded views. Handles URL-safe base64 variant.

**UUID Generator**
Generate v4 UUIDs. Click to copy. Option to generate multiple at once. Shows timestamp-based v7 UUIDs too.

**Regex Tester**
Enter a regex pattern and test string. Highlights matches. Shows capture groups. Explains the pattern in plain English.

**Color Converter**
Enter a color in any format (hex, RGB, HSL). See all equivalent formats. Shows color preview. Copy any format.

---

## Learning & Reference

**Flashcard Drill**
Paste a two-column list (term, definition). Drill through cards with flip-to-reveal. Shuffle option. Tracks which ones you got right in session.

**Pomodoro Timer**
Simple 25/5 minute work/break timer. Optional sound notification. Session counter. No accounts, just start.

**Decision Wheel**
Enter options, spin a wheel to pick randomly. Fun for choosing restaurants, settling debates. Weighted options available.

**Pros and Cons List**
Add items to pros and cons columns. Optional weighting. Shows a simple score. Export as markdown or image.

---

## Criteria for Good App Ideas

- Solves a real friction point people encounter
- Existing solutions are bloated, require accounts, or have too many ads
- Can be built as a single HTML file with vanilla JS
- Works entirely offline after initial load
- Data stays local (localStorage or URL state)
- Completes in one sitting, no ongoing engagement required
