/**
 * app-download.ts — Central configuration for the "Download the App" system.
 *
 * Toggle features on/off here without touching individual components.
 * Update store URLs as soon as the app is published.
 */

export const APP_CONFIG = {
  /** Toggle entire app-download system without deleting components */
  enabled: true,

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
