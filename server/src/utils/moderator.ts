import { env } from "../conf/env.js";

const PERSPECTIVE_API_URL = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${env.perspectiveApiKey}`;

async function checkToxicity(content: string): Promise<number | null> {
  const body = {
    comment: { text: content },
    doNotStore: true,
    languages: ["en", "hi", "hi-Latn"],
    // If you want to get back exact word‑level hits for highlighting,
    // turn this on. Otherwise omit it.
    spanAnnotations: true,
    // All the attributes you care about
    requestedAttributes: {
      INSULT: 0.7,
      IDENTITY_ATTACK: 0.6,
      THREAT: 0.4,
      PROFANITY: 0.6,
      TOXICITY: 0.8,
    },
  };

  try {
    const response = await fetch(PERSPECTIVE_API_URL, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();
    return result.attributeScores.TOXICITY.summaryScore.value;
  } catch (error) {
    console.error("Toxicity check failed:", error);
    return null; // Return null to indicate failure
  }
}

export async function validatePost(content: string) {
  const toxicityScore = await checkToxicity(content);

  if (toxicityScore !== null && toxicityScore >= 0.8) {
    return {
      allowed: false,
      reason: `high toxicity detected (${(toxicityScore * 100).toFixed(1)}%)`,
    };
  }

  // 3. Passed all checks
  return { allowed: true };
}
