require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const routes = require('./routes');
const { errorHandler } = require('./utils/errors');
const { startJobs } = require('./jobs/cron');

async function bootstrap() {
  await connectDB();

  const app = express();
  app.use(helmet());
  app.use(
    cors({
      origin: '*',
    })
  );
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get('/', (req, res) => {
    res.json({ success: true, message: 'EMS API running' });
  });

  app.use('/api', routes);
  app.use(errorHandler);

  startJobs();

  app.listen(env.port, () => {
    console.log(`EMS API listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
