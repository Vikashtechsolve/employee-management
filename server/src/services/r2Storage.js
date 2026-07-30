const path = require('path');
const crypto = require('crypto');
const {
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getR2Client, isR2Configured } = require('../config/r2');
const env = require('../config/env');
const { ApiError } = require('../utils/errors');
const { getTodayString } = require('../utils/dates');

function safeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function buildKey(module, userId, originalName) {
  const today = getTodayString(env.companyTimezone);
  const [y, m, d] = today.split('-');
  const uuid = crypto.randomUUID();
  return `${module}/${y}/${m}/${d}/${userId}/${uuid}-${safeFilename(originalName)}`;
}

function publicOrEmpty(key) {
  if (env.r2.publicUrl) return `${env.r2.publicUrl}/${key}`;
  return '';
}

function localDevAttachment({ buffer, mimeType, originalName, module, userId }) {
  const key = buildKey(module, userId, originalName);
  return {
    key,
    url: `local-dev://${key}`,
    originalName,
    mimeType,
    size: buffer.length,
    uploadedAt: new Date(),
    uploadedBy: userId,
  };
}

async function uploadBuffer({ buffer, mimeType, originalName, module, userId }) {
  if (!isR2Configured()) {
    // Dev fallback: store metadata with placeholder URL so app works without R2
    return localDevAttachment({ buffer, mimeType, originalName, module, userId });
  }

  const client = getR2Client();
  const key = buildKey(module, userId, originalName);

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: env.r2.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );
  } catch (err) {
    // R2 token/bucket misconfigured — keep work submit working with metadata-only storage
    console.warn(
      `[r2] upload failed (${err.name || 'Error'}: ${err.message}). Falling back to local-dev storage.`
    );
    return localDevAttachment({ buffer, mimeType, originalName, module, userId });
  }

  return {
    key,
    url: publicOrEmpty(key),
    originalName,
    mimeType,
    size: buffer.length,
    uploadedAt: new Date(),
    uploadedBy: userId,
  };
}

async function uploadFiles(files, { module, userId }) {
  const results = [];
  for (const file of files || []) {
    const meta = await uploadBuffer({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
      module,
      userId,
    });
    results.push(meta);
  }
  return results;
}

async function deleteKey(key) {
  if (!key || key.startsWith('local-dev://')) return;
  if (!isR2Configured()) return;
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: env.r2.bucket,
      Key: key.replace(/^local-dev:\/\//, ''),
    })
  );
}

async function deleteMany(keys = []) {
  const realKeys = keys.filter((k) => k && !String(k).startsWith('local-dev://'));
  if (!realKeys.length || !isR2Configured()) return;
  const client = getR2Client();
  await client.send(
    new DeleteObjectsCommand({
      Bucket: env.r2.bucket,
      Delete: {
        Objects: realKeys.map((Key) => ({ Key })),
        Quiet: true,
      },
    })
  );
}

async function getSignedDownloadUrl(key, expiresInSeconds = 900) {
  if (!key) throw new ApiError(400, 'Missing file key');
  if (String(key).startsWith('local-dev://')) {
    return { url: null, message: 'File stored in dev mode without R2' };
  }
  if (!isR2Configured()) throw new ApiError(503, 'R2 storage is not configured');

  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: env.r2.bucket,
    Key: key,
  });
  const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  return { url, expiresIn: expiresInSeconds };
}

function resolveViewUrl(attachment) {
  if (attachment.url && !attachment.url.startsWith('local-dev://')) return attachment.url;
  return null;
}

module.exports = {
  uploadBuffer,
  uploadFiles,
  deleteKey,
  deleteMany,
  getSignedDownloadUrl,
  resolveViewUrl,
  isR2Configured,
  buildKey,
  path,
};
