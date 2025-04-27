import { randomUUID } from "crypto";

export async function generateUuidBasedUsername(
  isUsernameTaken: (username: string) => Promise<boolean>,
  length = 12
) {
  const maxTries = 20;

  for (let i = 0; i < maxTries; i++) {
    const uuid = randomUUID().replace(/-/g, "").slice(0, length);

    const exists = await isUsernameTaken(uuid);
    if (!exists) {
      return uuid;
    }
  }

  // Fallback username in case of failure
  const fallbackUsername = `User${Date.now()}${Math.floor(
    Math.random() * 1000
  )}`;
  return fallbackUsername;
}
