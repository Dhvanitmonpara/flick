import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

export const env = {
  port: process.env.PORT || 8000,
  mongoUrl: process.env.MONGODB_URI,
  environment: process.env.ENVIRONMENT,
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY,
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  encryptionKey: process.env.ENCRYPTION_KEY,
  pepper: process.env.PEPPER,
  gmailUser: process.env.GMAIL_USER,
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
  accessControlOrigin:
    process.env.ACCESS_CONTROL_ORIGIN || "http://localhost:5173",
  redisHost: process.env.REDIS_HOST || "localhost",
  redisPort: process.env.REDIS_PORT || "6379",
};

if (!env.mongoUrl) {
  throw new Error("MONGODB_URI environment variable is not set");
}

if (!env.accessTokenSecret) {
  throw new Error("ACCESS_TOKEN_SECRET environment variable is not set");
}

if (!env.refreshTokenSecret) {
  throw new Error("REFRESH_TOKEN_SECRET environment variable is not set");
}

if (!env.encryptionKey) {
  throw new Error("ENCRYPTION_KEY environment variable is not set");
}

if (!env.pepper) {
  throw new Error("PEPPER environment variable is not set");
}

if (!env.gmailUser) {
  throw new Error("GMAIL_USER environment variable is not set");
}

if (!env.gmailAppPassword) {
  throw new Error("GMAIL_APP_PASSWORD environment variable is not set");
}

if (!env.accessControlOrigin) {
  throw new Error("ACCESS_CONTROL_ORIGIN environment variable is not set");
}

if (!env.redisHost) {
  throw new Error("REDIS_HOST environment variable is not set");
}

if (!env.redisPort) {
  throw new Error("REDIS_PORT environment variable is not set");
}

if (!env.environment) {
  throw new Error("ENVIRONMENT environment variable is not set");
}

if (!env.accessTokenExpiry) {
  throw new Error("ACCESS_TOKEN_EXPIRY environment variable is not set");
}

if (!env.refreshTokenExpiry) {
  throw new Error("REFRESH_TOKEN_EXPIRY environment variable is not set");
}

if (!env.port) {
  throw new Error("PORT environment variable is not set");
}

console.log("Environment variables loaded");
