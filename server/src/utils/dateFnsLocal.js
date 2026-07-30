// Lightweight stubs — real logic lives in dates.js via Intl
module.exports = {
  formatInTimeZone: (date, tz, pattern) => {
    if (pattern === 'yyyy-MM-dd') {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(date));
    }
    return String(date);
  },
  toZonedTime: (date) => new Date(date),
};
