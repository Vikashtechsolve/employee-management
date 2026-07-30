const { S3Client } = require('@aws-sdk/client-s3');
const env = require('./env');

let r2Client = null;

function getR2Client() {
  if (r2Client) return r2Client;

  if (!env.r2.endpoint || !env.r2.accessKeyId || !env.r2.secretAccessKey) {
    return null;
  }

  r2Client = new S3Client({
    region: 'auto',
    endpoint: env.r2.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.r2.accessKeyId,
      secretAccessKey: env.r2.secretAccessKey,
    },
  });

  return r2Client;
}

function isR2Configured() {
  return Boolean(getR2Client() && env.r2.bucket);
}

module.exports = { getR2Client, isR2Configured };
