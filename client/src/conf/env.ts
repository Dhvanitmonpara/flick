export const env = {
  serverUri: import.meta.env.VITE_SERVER_URI,
  serverApiEndpoint: import.meta.env.VITE_SERVER_API_ENDPOINT,
  baseUrl: import.meta.env.VITE_BASE_URL,
  geminiKey: import.meta.env.VITE_GEMINI_KEY,
};

if (!env.serverApiEndpoint) {
  throw new Error("Missing VITE_SERVER_API_ENDPOINT env variable");
}

if (!env.serverUri) {
  throw new Error("Missing VITE_SERVER_URI env variable");
}

if (!env.geminiKey) {
  throw new Error("Missing VITE_GEMINI_KEY env variable");
}

if (!env.baseUrl) {
  throw new Error("Missing VITE_BASE_URL env variable");
}
