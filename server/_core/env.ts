export const ENV = {
  jwtSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // OpenAI-compatible API (OpenAI, Azure, local, etc.)
  forgeApiUrl: process.env.OPENAI_API_URL ?? "",
  forgeApiKey: process.env.OPENAI_API_KEY ?? "",
  // S3-compatible storage (R2, MinIO, AWS S3, etc.)
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  s3Region: process.env.S3_REGION ?? "auto",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3PublicUrl: process.env.S3_PUBLIC_URL ?? "",
};