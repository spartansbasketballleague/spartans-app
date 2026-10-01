import { Game } from './games';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}

export function todayISO() {
  const t = new Date();
  const p = (x: number) => String(x).padStart(2, '0');
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

export function dayShort(d: string) {
  return DAYS[parseDate(d).getDay()];
}

export function monthDay(d: string) {
  const dt = parseDate(d);
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}

export function longDate(d: string) {
  const dt = parseDate(d);
  return `${DAYS[dt.getDay()]}, ${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}

export function clock(t: string) {
  if (!t) return 'TBD';
  const [h, m] = t.split(':').map(Number);
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function statusLine(g: Game) {
  switch (g.status) {
    case 'live':
      return g.half >= 2 ? '2nd Half' : '1st Half';
    case 'final':
      return 'Final';
    case 'cancelled':
      return 'Cancelled';
    default:
      return clock(g.time);
  }
}

export const one = (x: number) => (Math.round(x * 10) / 10).toFixed(1);

export function ago(ts: number) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} days ago`;
}
