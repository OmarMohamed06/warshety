/**
 * app-download.ts — Central configuration for the app promotion system.
 *
 * Toggle features on/off here without touching individual components.
 */

export const APP_CONFIG = {
  /** Toggle entire app promotion system without deleting components */
  enabled: true,

  /**
   * Is the app actually published yet?
   *
   * While false, every surface promotes the app as "coming soon": store
   * badges render as non-interactive labels, the /download page stops
   * redirecting to the stores, and no dead App Store / Google Play link is
   * shown anywhere. Flip this to true on launch day — the store URLs below
   * are already in place, so nothing else needs editing.
   */
  released: false,

  /** Individual feature toggles */
  features: {
    hero: true,
    floatingBanner: true,
    smartBookingPrompt: true,
    bookingTrackingCTA: true,
    rewardsPromo: true,
    garagePromo: true,
    profileBanner: true,
    serviceCenterCTA: true,
    footerSection: true,
    featureComparison: true,
  },

  app: {
    name: "Warshety",
    tagline: "Egypt's #1 Car Services App",
    taglineAr: "تطبيق ورشتي الأول في مصر لخدمات السيارات",
  },

  urls: {
    ios: "https://apps.apple.com/app/warshety",
    android: "https://play.google.com/store/apps/details?id=com.warshety.app",
    download: "https://warshety.com/download",
    deepLink: "warshety://",
  },

  /** Days before the floating banner reappears after dismissal */
  bannerDismissDays: 7,
} as const;

export type AppConfig = typeof APP_CONFIG;
