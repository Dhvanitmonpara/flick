import { Redis } from "ioredis";
import { env } from "../conf/env.js";

if (typeof Redis === "undefined") throw new Error("Redis is not installed");
const redisClient = new Redis({
  host: env.redisHost,
  port: parseInt(env.redisPort),
});

redisClient.on("connect", () => {
  console.log("Redis connected");
});

redisClient.on("error", (err) => {
  console.error("Redis connection error:", err);
});

export default redisClient