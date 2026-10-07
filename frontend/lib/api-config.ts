// Prefer the new `NEXT_PUBLIC_BACKEND_URL` env var, but fall back to the
// older `NEXT_PUBLIC_API_URL` for compatibility.
const configuredApiUrl = (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:5000'
).trim();

export const API_BASE_URL = configuredApiUrl.replace(/\/+$/, '');