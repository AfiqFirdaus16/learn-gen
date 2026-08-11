const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://learn-gen-ifll-go731l8pk-fafiq8445-gmailcoms-projects.vercel.app';

export const API_BASE_URL = configuredApiUrl.replace(/\/$/, '');
