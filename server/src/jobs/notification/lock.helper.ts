import { randomUUID } from "crypto";
import redisClient from "../../services/redis.service.js";

class Lock {
  private lockKey;
  private redisClient;
  private lockValue = "";
  private lockTTL = 30;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor(redisClientInstance: typeof redisClient, lockKey: string, lockTTL?: number) {
    this.redisClient = redisClientInstance;
    this.lockKey = lockKey;
    this.lockTTL = lockTTL ?? this.lockTTL;
  }

  public startHeartbeat = () => {
    this.heartbeatInterval = setInterval(async () => {
      try {
        const currentVal = await this.redisClient.get(this.lockKey);
        if (currentVal === this.lockValue) {
          await this.redisClient.expire(this.lockKey, this.lockTTL);
          console.log("Lock heartbeat refreshed");
        } else {
          console.warn("Lock stolen or expired");
        }
      } catch (err) {
        console.error("Heartbeat refresh failed:", err);
      }
    }, (this.lockTTL * 1000) / 2); // Refresh halfway through TTL
  };

  public stopHeartbeat = () => {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  };

  public acquireLock = async () => {
    this.lockValue = randomUUID();
    const result = await (redisClient as any).set(
      this.lockKey,
     this.lockValue,
      "NX",
      "EX",
      this.lockTTL
    );
    return result === "OK";
  };

  public releaseLock = async () => {
    try {
      const currentVal = await redisClient.get(this.lockKey);
      if (currentVal === this.lockValue) {
        await redisClient.del(this.lockKey);
        console.log("Lock released");
      } else {
        console.warn("Lock not released — no longer owned");
      }
    } catch (err) {
      console.error("Failed to release lock:", err);
    }
  };
}

export default Lock;