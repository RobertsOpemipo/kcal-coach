/** Local calendar day in Africa/Lagos (UTC+1, no DST), as YYYY-MM-DD. */
const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
});
export const lagosDate = (d: Date = new Date()): string => fmt.format(d);
