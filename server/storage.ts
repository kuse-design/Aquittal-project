import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";
import { nanoid } from "nanoid";

function getS3Config() {
  const endpoint = ENV.s3Endpoint;
  const region = ENV.s3Region;
  const accessKeyId = ENV.s3AccessKeyId;
  const secretAccessKey = ENV.s3SecretAccessKey;
  const bucket = ENV.s3Bucket;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "Storage config missing: set S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET",
    );
  }

  return { endpoint, region, accessKeyId, secretAccessKey, bucket };
}

function getS3Client() {
  const { endpoint, region, accessKeyId, secretAccessKey } = getS3Config();
  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

function getPublicUrl(key: string): string {
  const { bucket } = getS3Config();
  const publicUrl = ENV.s3PublicUrl;
  if (publicUrl) {
    return `${publicUrl.replace(/\/+$/, "")}/${key}`;
  }
  return `/api/storage/${key}`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const { bucket } = getS3Config();
  const key = appendHashSuffix(normalizeKey(relKey));
  const client = getS3Client();

  const blob =
    typeof data === "string"
      ? Buffer.from(data)
      : Buffer.from(data as Uint8Array);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: blob,
      ContentType: contentType,
    }),
  );

  return { key, url: getPublicUrl(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: getPublicUrl(key) };
}

export async function storageGetSignedUrl(relKey: string, expiresIn = 3600): Promise<string> {
  const { bucket } = getS3Config();
  const key = normalizeKey(relKey);
  const client = getS3Client();

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

export async function storageDelete(relKey: string): Promise<void> {
  const { bucket } = getS3Config();
  const key = normalizeKey(relKey);
  const client = getS3Client();

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}