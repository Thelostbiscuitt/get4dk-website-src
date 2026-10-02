/**
 * Central CTA target configuration — the single layer every product CTA
 * resolves through (W6).
 *
 * Destinations are REAL routes of the 4DK application (verified against the
 * app's route table, read-only): the app hosts a live self-serve signup
 * (welcome → START COOKING register, plus the app-native deep link
 * /login?intent=save-kitchen), so no CTA falls back to a mailto stub.
 *
 * The app host is locked: https://app.get4dk.com (never a dev/beta host).
 * Marketing pages demonstrate the app; actual product actions live in the
 * app — no app functionality is recreated on the marketing site.
 */

export const APP_ORIGIN = 'https://app.get4dk.com';

/** App routes that marketing CTAs may address (app Router, verified W6). */
export const APP_PUBLIC_ROUTES = [
  '/', '/login', '/pantry', '/discover', '/cook', '/saved', '/plan',
  '/shop', '/tools', '/house', '/scan', '/steal', '/leftovers', '/people',
  '/preferences', '/history', '/plans',
] as const;

export interface CtaTarget {
  href: string;
  label: string;
}

export const CTA = {
  /** Generic "Start cooking →" bridges → app welcome (logged-out: the app's
   *  own Guard presents register/sign-in; logged-in: home). */
  startCooking: { href: `${APP_ORIGIN}/`, label: 'Start cooking' },
  /** Signup-intent CTAs ("Get 4DK", "Try 4DK", "Request beta access") → the
   *  app's register form via its native conversion deep link. */
  get4dk: { href: `${APP_ORIGIN}/login?intent=save-kitchen`, label: 'Get 4DK' },
  try4dk: { href: `${APP_ORIGIN}/login?intent=save-kitchen`, label: 'Try 4DK' },
  betaAccess: { href: `${APP_ORIGIN}/login?intent=save-kitchen`, label: 'Request beta access' },
  /** Feature surfaces (C1 problem pages + feature bridges). */
  appAsk: { href: `${APP_ORIGIN}/discover`, label: 'Ask 4DK' },
  appPantry: { href: `${APP_ORIGIN}/pantry`, label: 'Pantry' },
  appScan: { href: `${APP_ORIGIN}/scan`, label: 'Kitchen Scan' },
  appSteal: { href: `${APP_ORIGIN}/steal`, label: 'STEAL IT' },
} as const satisfies Record<string, CtaTarget>;

/**
 * Mailto literal used by approved artifacts — mapped centrally at port time.
 * W6: resolves to the app's real signup flow (see betaAccess); the mailto
 * stub itself never ships.
 */
export const LEGACY_BETA_MAILTO = 'mailto:hello@get4dk.com?subject=4DK%20Beta%20Access';
