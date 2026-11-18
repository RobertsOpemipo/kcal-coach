/** Local calendar day in Africa/Lagos (UTC+1, no DST), as YYYY-MM-DD. */
const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
});
export const lagosDate = (d: Date = new Date()): string => fmt.format(d);

const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', hourCycle: 'h23' });
/** Hour of day 0-23 in Africa/Lagos. */
export const lagosHour = (d: Date = new Date()): number => Number(hourFmt.format(d));

/** Shift a YYYY-MM-DD date by n days (calendar arithmetic, no timezone involved). */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** "Today", "Yesterday", "Tomorrow", otherwise "Fri 13 Nov". */
export function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  if (date === addDays(today, 1)) return 'Tomorrow';
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[wd]} ${d} ${MONTHS[m - 1]}`;
}
