import type { MetadataRoute } from "next";
import { BASE_URL } from "@/utils/seo";

/**
 * robots.txt configuration
 *
 * Allow: All public-facing pages (/ar/, /en/)
 * Disallow: Admin, dashboard, API, vendor management, auth
 *
 * Sitemap: points to the dynamic sitemap.xml
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/ar/", "/en/"],
        disallow: [
          "/admin",
          "/dashboard",
          "/api/",
          "/ar/admin/",
          "/en/admin/",
          "/ar/vendor/",
          "/en/vendor/",
          "/ar/profile/",
          "/en/profile/",
          "/ar/auth/",
          "/en/auth/",
          "/ar/checkout/",
          "/en/checkout/",
          "/*?*", // prevent crawling query-string duplicates
        ],
      },
      {
        // Allow Google to index everything allowed above
        userAgent: "Googlebot",
        allow: ["/ar/", "/en/"],
        disallow: [
          "/admin",
          "/api/",
          "/ar/admin/",
          "/en/admin/",
          "/ar/auth/",
          "/en/auth/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
