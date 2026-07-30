const { formatInTimeZone, toZonedTime } = require('./dateFnsLocal');

/** Simple timezone-aware helpers without extra deps beyond Intl */

function getTodayString(timezone = 'Asia/Kolkata') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatDateString(date, timezone = 'Asia/Kolkata') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}

function getTimeHM(date, timezone = 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(date));
  const hour = parts.find((p) => p.type === 'hour')?.value || '00';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';
  return `${hour}:${minute}`;
}

function compareHM(a, b) {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return ah * 60 + am - (bh * 60 + bm);
}

function getWeekday(dateStr, timezone = 'Asia/Kolkata') {
  // dateStr YYYY-MM-DD -> weekday in timezone (0 Sun .. 6 Sat)
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(d);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wd] ?? d.getUTCDay();
}

function eachDateInclusive(start, end) {
  const dates = [];
  const cur = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function countWeekdays(start, end, workWeek = [1, 2, 3, 4, 5], timezone = 'Asia/Kolkata') {
  return eachDateInclusive(start, end).filter((d) => workWeek.includes(getWeekday(d, timezone)))
    .length;
}

function escapeCsv(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

module.exports = {
  getTodayString,
  formatDateString,
  getTimeHM,
  compareHM,
  getWeekday,
  eachDateInclusive,
  countWeekdays,
  escapeCsv,
  formatInTimeZone,
  toZonedTime,
};
