const cron = require('node-cron');
const { markAbsentsForDate } = require('../services/attendanceEngine');
const { getTodayString } = require('../utils/dates');
const env = require('../config/env');

function startJobs() {
  // Every day at 23:30 company-ish — uses server local schedule; marks "today"
  cron.schedule('30 23 * * *', async () => {
    try {
      const date = getTodayString(env.companyTimezone);
      const result = await markAbsentsForDate(date);
      console.log('[cron] mark absents', result);
    } catch (err) {
      console.error('[cron] mark absents failed', err.message);
    }
  });

  console.log('Cron jobs scheduled');
}

module.exports = { startJobs };
