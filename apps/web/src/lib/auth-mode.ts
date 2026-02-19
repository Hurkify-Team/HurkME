const explicitBypass = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true';
const hasClerkPublishableKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// Local dev should stay usable even if Clerk keys are not configured yet.
export const AUTH_BYPASS = explicitBypass || !hasClerkPublishableKey;
