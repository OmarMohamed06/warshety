"use client";

/**
 * LocaleLink — drop-in replacement for Next.js <Link> that automatically
 * prepends the active locale prefix (e.g. /en or /ar) to internal hrefs.
 *
 * Usage: import { LocaleLink as Link } from "@/components/ui/locale-link"
 *
 * External URLs (http/https), anchor links (#), and paths that already
 * start with a locale prefix are passed through unchanged.
 */

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useLanguage } from "@/context/LanguageContext";

type Props = ComponentProps<typeof NextLink>;

export function LocaleLink({
  href,
  locale: _locale,
  ...props
}: Props & { locale?: unknown }) {
  const { localePath } = useLanguage();

  const resolved = typeof href === "string" ? localePath(href) : href;

  return <NextLink href={resolved} {...props} />;
}
