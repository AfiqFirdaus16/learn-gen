// Prefer the new `NEXT_PUBLIC_BACKEND_URL` env var, but fall back to the
// older `NEXT_PUBLIC_API_URL` for compatibility.
const configuredApiUrl =
	process.env.NEXT_PUBLIC_BACKEND_URL ||
	process.env.NEXT_PUBLIC_API_URL ||
	'https://learn-gen-ifll-go731l8pk-fafiq8445-gmailcoms-projects.vercel.app';

export const API_BASE_URL = configuredApiUrl.replace(/\/$/, '');