import { JournalEntry } from '../types/journal';

/**
 * Calculates estimated reading time for a given text content.
 * Standard adult reading speed is ~200-220 words per minute.
 */
export function calculateReadingTime(text: string): { words: number; minutes: number; label: string } {
  const clean = text.trim();
  if (!clean) {
    return { words: 0, minutes: 0, label: '< 1 min de lectura' };
  }
  const words = clean.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  const label = minutes === 1 ? '1 min de lectura' : `${minutes} min de lectura`;
  return { words, minutes, label };
}

/**
 * Computes daily writing streak (consecutive days with at least one entry).
 */
export function calculateStreak(entries: JournalEntry[]): {
  currentStreak: number;
  longestStreak: number;
  totalDaysWritten: number;
} {
  if (!entries || entries.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalDaysWritten: 0 };
  }

  // Extract unique sorted dates (YYYY-MM-DD)
  const uniqueDates = Array.from(
    new Set(
      entries
        .map((e) => (e.date || e.createdAt?.split('T')[0] || '').trim())
        .filter((d) => Boolean(d) && /^\d{4}-\d{2}-\d{2}$/.test(d))
    )
  ).sort().reverse(); // Newest first

  if (uniqueDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalDaysWritten: 0 };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Current streak calculation
  let currentStreak = 0;
  let checkDate = new Date();

  // If user hasn't written today yet, check if streak is alive from yesterday
  if (!uniqueDates.includes(todayStr)) {
    if (uniqueDates.includes(yesterdayStr)) {
      checkDate = yesterday;
    } else {
      // Streak broken
      currentStreak = 0;
    }
  }

  if (uniqueDates.includes(checkDate.toISOString().split('T')[0])) {
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (uniqueDates.includes(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Longest streak calculation
  const sortedAsc = [...uniqueDates].sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedAsc) {
    const cur = new Date(dateStr + 'T00:00:00');
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffTime = cur.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = cur;
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    totalDaysWritten: uniqueDates.length,
  };
}

export interface TimeCapsuleMemory {
  entry: JournalEntry;
  type: 'years_ago' | 'months_ago' | 'recent_anniversary';
  label: string;
}

/**
 * Finds entries written "On This Day" (same month & day in a past year or exactly 6/1 months ago).
 */
export function findOnThisDayMemories(entries: JournalEntry[]): TimeCapsuleMemory[] {
  if (!entries || entries.length === 0) return [];

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  const memories: TimeCapsuleMemory[] = [];

  for (const entry of entries) {
    const dateStr = entry.date || entry.createdAt?.split('T')[0];
    if (!dateStr) continue;

    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const eYear = parseInt(yearStr, 10);
    const eMonth = parseInt(monthStr, 10);
    const eDay = parseInt(dayStr, 10);

    if (eYear < currentYear && eMonth === currentMonth && eDay === currentDay) {
      const yearsDiff = currentYear - eYear;
      memories.push({
        entry,
        type: 'years_ago',
        label: yearsDiff === 1 ? 'Hace exactamente 1 año' : `Hace exactamente ${yearsDiff} años`,
      });
    }
  }

  return memories;
}

export interface DayHeatmapData {
  date: string;
  count: number;
  words: number;
  level: 0 | 1 | 2 | 3; // 0: none, 1: light, 2: medium, 3: dense
}

/**
 * Generates continuous 365-day heatmap data for the past 52 weeks.
 */
export function generateAnnualHeatmap(entries: JournalEntry[]): {
  days: DayHeatmapData[];
  totalWordsYear: number;
  totalEntriesYear: number;
} {
  const entriesByDate: Record<string, { count: number; words: number }> = {};

  let totalWordsYear = 0;
  let totalEntriesYear = 0;

  for (const e of entries) {
    const dateStr = e.date || e.createdAt?.split('T')[0];
    if (!dateStr) continue;
    const words = (e.content || '').trim().split(/\s+/).filter(Boolean).length;
    if (!entriesByDate[dateStr]) {
      entriesByDate[dateStr] = { count: 0, words: 0 };
    }
    entriesByDate[dateStr].count += 1;
    entriesByDate[dateStr].words += words;
  }

  const days: DayHeatmapData[] = [];
  const today = new Date();
  // We compute 52 weeks back starting on Sunday
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (52 * 7) + (7 - today.getDay()));

  const cur = new Date(startDate);
  while (cur <= today) {
    const dateStr = cur.toISOString().split('T')[0];
    const data = entriesByDate[dateStr] || { count: 0, words: 0 };

    let level: 0 | 1 | 2 | 3 = 0;
    if (data.count === 1) level = 1;
    else if (data.count === 2) level = 2;
    else if (data.count >= 3) level = 3;

    if (cur.getFullYear() === today.getFullYear()) {
      totalWordsYear += data.words;
      totalEntriesYear += data.count;
    }

    days.push({
      date: dateStr,
      count: data.count,
      words: data.words,
      level,
    });

    cur.setDate(cur.getDate() + 1);
  }

  return { days, totalWordsYear, totalEntriesYear };
}

export interface MoodDistributionItem {
  mood: string;
  count: number;
  percentage: number;
}

/**
 * Computes mood frequencies and percentages over the last 30 days and all-time.
 */
export function calculateMoodDistribution(entries: JournalEntry[]): {
  items: MoodDistributionItem[];
  topMood: string | null;
  totalTagged: number;
} {
  const counts: Record<string, number> = {};
  let totalTagged = 0;

  for (const e of entries) {
    if (e.mood && e.mood.trim()) {
      const mood = e.mood.trim();
      counts[mood] = (counts[mood] || 0) + 1;
      totalTagged++;
    }
  }

  const items: MoodDistributionItem[] = Object.entries(counts)
    .map(([mood, count]) => ({
      mood,
      count,
      percentage: totalTagged > 0 ? Math.round((count / totalTagged) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    items,
    topMood: items.length > 0 ? items[0].mood : null,
    totalTagged,
  };
}
