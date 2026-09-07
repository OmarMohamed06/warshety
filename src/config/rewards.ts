/**
 * rewards.ts — Central configuration for the rewards programme.
 *
 * Toggle behaviour here rather than in individual components, the same way
 * `app-download.ts` gates the app promotion surfaces.
 */

export const REWARDS_CONFIG = {
  /**
   * Is the rewards catalogue live?
   *
   * While false, the catalogue tab shows a "coming soon" panel instead of an
   * empty grid, and the vouchers tab stops inviting people to redeem rewards
   * that do not exist. Everything else on the page is untouched: points are
   * real, they keep accruing from bookings and reviews, and the balance and
   * history stay visible.
   *
   * Flip this to true once real rewards exist in the `rewards` table — the
   * catalogue, its category filters and the redeem flow are all still wired
   * up behind it, so nothing else needs editing.
   */
  catalogueLive: false,
} as const;

export type RewardsConfig = typeof REWARDS_CONFIG;
