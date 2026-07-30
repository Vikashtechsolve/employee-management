require('dotenv').config();

const env = {
  port: Number(process.env.PORT) || 5050,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ems',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  companyTimezone: process.env.COMPANY_TIMEZONE || 'Asia/Kolkata',
  defaultCutoff: process.env.DEFAULT_CUTOFF || '11:00',
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB) || 5,
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET_NAME || 'ems-attachments',
    publicUrl: (process.env.R2_PUBLIC_URL || '').replace(/\/$/, ''),
    endpoint:
      process.env.R2_ENDPOINT ||
      (process.env.R2_ACCOUNT_ID
        ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : ''),
  },
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@company.com',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
};

module.exports = env;
