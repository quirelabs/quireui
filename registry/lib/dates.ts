// Plain calendar dates as "YYYY-MM-DD" strings: no time, no timezone, so a date never shifts
// by a day between the server, the browser and the database.

export type PlainDate = string;
export type DateRange = { from: PlainDate; to: PlainDate };

const pad = (n: number) => String(n).padStart(2, "0");

export function toPlain(year: number, month: number, day: number): PlainDate {
  // Date.UTC rolls over overflowing months and days, e.g. month 13 is next January.
  const d = new Date(Date.UTC(year, month - 1, day));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function parts(date: PlainDate) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

export const isPlain = (value: unknown): value is PlainDate =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Today in the browser's own timezone. Call it from effects and events, never while rendering. */
export function todayPlain(): PlainDate {
  const now = new Date();
  return toPlain(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(date: PlainDate, days: number): PlainDate {
  const { year, month, day } = parts(date);
  return toPlain(year, month, day + days);
}

/** Months forward or back, keeping the day where it fits: Jan 31 plus a month is Feb 28. */
export function addMonths(date: PlainDate, months: number): PlainDate {
  const { year, month, day } = parts(date);
  const first = toPlain(year, month + months, 1);
  const { year: y, month: m } = parts(first);
  return toPlain(y, m, Math.min(day, daysInMonth(y, m)));
}

export const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** 0 is Sunday. */
export const weekday = (date: PlainDate) => {
  const { year, month, day } = parts(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

export const startOfWeek = (date: PlainDate, weekStartsOn: number) =>
  addDays(date, -((weekday(date) - weekStartsOn + 7) % 7));

export const startOfMonth = (date: PlainDate) => {
  const { year, month } = parts(date);
  return toPlain(year, month, 1);
};

export const endOfMonth = (date: PlainDate) => {
  const { year, month } = parts(date);
  return toPlain(year, month, daysInMonth(year, month));
};

export const sameMonth = (a: PlainDate, b: PlainDate) => a.slice(0, 7) === b.slice(0, 7);

export const clamp = (date: PlainDate, min?: PlainDate, max?: PlainDate) =>
  min && date < min ? min : max && date > max ? max : date;

/** Whole days from a to b, counting both ends: Oct 1 to Oct 3 is 3 days. */
export function spanDays(range: DateRange) {
  const a = parts(range.from);
  const b = parts(range.to);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000) + 1;
}

/** The six weeks a month grid shows, starting on the locale's first day of the week. */
export function monthGrid(month: PlainDate, weekStartsOn: number): PlainDate[][] {
  const start = startOfWeek(startOfMonth(month), weekStartsOn);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
}

/** The first day of the week in a locale: Monday in most of the world, Sunday in the US and a few others. */
export function firstDayOfWeek(locale: string): number {
  try {
    // Not in every browser yet; where it is, it knows the locale's real convention.
    const info = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const first = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
    if (first) return first % 7;
  } catch {}
  return /-(US|CA|JP|BR|MX|IL|PH|KR|TW|IN)$/i.test(locale) || locale === "en" ? 0 : 1;
}

// ---------------------------------------------------------------------------------------------
// Reading typed dates: "oct 3", "3/10", "tomorrow", "next fri", "in 2 weeks", "+3d", "eom".

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const monthIndex = (word: string) => {
  const i = MONTHS.findIndex(
    (m) =>
      word.startsWith(m) &&
      (word.length === 3 ||
        "january february march april may june july august september october november december".includes(word)),
  );
  return i === -1 ? -1 : i + 1;
};

const dayIndex = (word: string) =>
  word.length >= 2
    ? DAYS.findIndex(
        (d) =>
          d.startsWith(word.slice(0, 3)) && "sunday monday tuesday wednesday thursday friday saturday".includes(word),
      )
    : -1;

const UNIT: Record<string, "d" | "w" | "m" | "y"> = {
  d: "d",
  day: "d",
  days: "d",
  w: "w",
  wk: "w",
  week: "w",
  weeks: "w",
  m: "m",
  mo: "m",
  month: "m",
  months: "m",
  y: "y",
  yr: "y",
  year: "y",
  years: "y",
};

function shift(date: PlainDate, amount: number, unit: "d" | "w" | "m" | "y") {
  if (unit === "d") return addDays(date, amount);
  if (unit === "w") return addDays(date, amount * 7);
  if (unit === "m") return addMonths(date, amount);
  return addMonths(date, amount * 12);
}

function valid(year: number, month: number, day: number): PlainDate | null {
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return toPlain(year, month, day);
}

const fullYear = (y: number) => (y < 100 ? 2000 + y : y);

/**
 * Reads one typed date, relative to `today`. `dayFirst` decides what "3/10" means: the 3rd of
 * October (most of the world) or March 10 (the US). Returns null when it is not a date.
 */
export function parseDate(input: string, today: PlainDate, dayFirst: boolean): PlainDate | null {
  const text = input
    .trim()
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(\d)(st|nd|rd|th)\b/g, "$1");
  if (!text) return null;
  const { year: thisYear } = parts(today);

  if (["today", "tod", "now", "t"].includes(text)) return today;
  if (["tomorrow", "tom", "tmr", "tmrw"].includes(text)) return addDays(today, 1);
  if (["yesterday", "yest", "yday"].includes(text)) return addDays(today, -1);
  if (["eom", "end of month"].includes(text)) return endOfMonth(today);
  if (["som", "start of month"].includes(text)) return startOfMonth(today);
  if (["eoy", "end of year"].includes(text)) return toPlain(thisYear, 12, 31);

  let m = text.match(/^([+-])\s*(\d+)\s*([a-z]*)$/);
  if (m && (m[3] === "" || UNIT[m[3]])) return shift(today, Number(m[2]) * (m[1] === "-" ? -1 : 1), UNIT[m[3]] ?? "d");
  m = text.match(/^in (\d+) ([a-z]+)$/);
  if (m && UNIT[m[2]]) return shift(today, Number(m[1]), UNIT[m[2]]);
  m = text.match(/^(\d+) ([a-z]+) ago$/);
  if (m && UNIT[m[2]]) return shift(today, -Number(m[1]), UNIT[m[2]]);

  // Weekdays: "fri" is the coming Friday (today if it is Friday), "next fri" the one after, "last fri" the one before.
  m = text.match(/^(next |last |this )?([a-z]+)$/);
  if (m && dayIndex(m[2]) !== -1) {
    const target = dayIndex(m[2]);
    const ahead = (target - weekday(today) + 7) % 7;
    if (m[1] === "last ") return addDays(today, ahead === 0 ? -7 : ahead - 7);
    if (m[1] === "next ") return addDays(today, ahead + 7);
    return addDays(today, ahead);
  }

  m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]));

  m = text.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    const year = m[3] ? fullYear(Number(m[3])) : thisYear;
    return dayFirst ? valid(year, b, a) : valid(year, a, b);
  }

  // Month names either side: "oct 3", "october 3 2026", "3 oct", "3 october 2026".
  m = text.match(/^([a-z]+) (\d{1,2})(?: (\d{2,4}))?$/) ?? null;
  if (m && monthIndex(m[1]) !== -1)
    return valid(m[3] ? fullYear(Number(m[3])) : thisYear, monthIndex(m[1]), Number(m[2]));
  m = text.match(/^(\d{1,2}) ([a-z]+)(?: (\d{2,4}))?$/);
  if (m && monthIndex(m[2]) !== -1)
    return valid(m[3] ? fullYear(Number(m[3])) : thisYear, monthIndex(m[2]), Number(m[1]));

  return null;
}

/**
 * Reads a typed range: two dates ("oct 1 - oct 20", "oct 1-20"), or a period by name
 * ("last 7 days", "this month", "last quarter", "q3", "ytd", "october", "2025").
 */
export function parseRange(input: string, today: PlainDate, dayFirst: boolean): DateRange | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!text) return null;
  const { year, month } = parts(today);

  let m = text.match(/^(?:last|past) (\d+) ([a-z]+)$/);
  if (m && UNIT[m[2]])
    return {
      from: addDays(shift(today, -Number(m[1]), UNIT[m[2]]), 1),
      to: today,
    };
  m = text.match(/^next (\d+) ([a-z]+)$/);
  if (m && UNIT[m[2]])
    return {
      from: today,
      to: addDays(shift(today, Number(m[1]), UNIT[m[2]]), -1),
    };

  const quarter = (y: number, q: number) => ({
    from: toPlain(y, q * 3 - 2, 1),
    to: endOfMonth(toPlain(y, q * 3, 1)),
  });
  const thisQuarter = Math.ceil(month / 3);
  const named: Record<string, () => DateRange> = {
    "this week": () => ({
      from: startOfWeek(today, 1),
      to: addDays(startOfWeek(today, 1), 6),
    }),
    "last week": () => ({
      from: addDays(startOfWeek(today, 1), -7),
      to: addDays(startOfWeek(today, 1), -1),
    }),
    "this month": () => ({ from: startOfMonth(today), to: endOfMonth(today) }),
    "last month": () => ({
      from: startOfMonth(addMonths(today, -1)),
      to: endOfMonth(addMonths(today, -1)),
    }),
    "this quarter": () => quarter(year, thisQuarter),
    "last quarter": () => (thisQuarter === 1 ? quarter(year - 1, 4) : quarter(year, thisQuarter - 1)),
    "this year": () => ({
      from: toPlain(year, 1, 1),
      to: toPlain(year, 12, 31),
    }),
    "last year": () => ({
      from: toPlain(year - 1, 1, 1),
      to: toPlain(year - 1, 12, 31),
    }),
    ytd: () => ({ from: toPlain(year, 1, 1), to: today }),
    "year to date": () => ({ from: toPlain(year, 1, 1), to: today }),
    mtd: () => ({ from: startOfMonth(today), to: today }),
    "month to date": () => ({ from: startOfMonth(today), to: today }),
  };
  if (named[text]) return named[text]();

  m = text.match(/^q([1-4])(?: (\d{2,4}))?$/);
  if (m) return quarter(m[2] ? fullYear(Number(m[2])) : year, Number(m[1]));
  m = text.match(/^(\d{4})$/);
  if (m)
    return {
      from: toPlain(Number(m[1]), 1, 1),
      to: toPlain(Number(m[1]), 12, 31),
    };
  m = text.match(/^([a-z]+)(?: (\d{4}))?$/);
  if (m && monthIndex(m[1]) !== -1) {
    const first = toPlain(m[2] ? Number(m[2]) : year, monthIndex(m[1]), 1);
    return { from: first, to: endOfMonth(first) };
  }

  // Two ends, split on a dash, "to" or "..". The second may leave out the month: "oct 1-20".
  const sides = text.split(/\s*(?:–|—|\.\.| to |\s-\s|-(?=\s*[a-z\d]+$))\s*/);
  if (sides.length === 2) {
    const from = parseDate(sides[0], today, dayFirst);
    let to = parseDate(sides[1], today, dayFirst);
    if (from && !to && /^\d{1,2}$/.test(sides[1])) to = valid(parts(from).year, parts(from).month, Number(sides[1]));
    if (from && to) return from <= to ? { from, to } : { from: to, to: from };
  }
  // One date on its own is a one-day range.
  const single = parseDate(text, today, dayFirst);
  return single ? { from: single, to: single } : null;
}
