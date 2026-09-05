import { cn } from "@/lib/utils";

/**
 * Icon — the single entry point for Material Symbols glyphs.
 *
 * Two rules this component exists to enforce:
 *
 * 1. Icons do not own a colour. They inherit `currentColor` from whatever
 *    they sit in, so an icon can never drift out of step with its own label.
 *    Semantic colour belongs on the container (the alert, the badge, the
 *    button) — colour it once and both the icon and its text follow.
 *
 * 2. Sizes come from a token scale, never an ad-hoc `fontSize`. Material
 *    Symbols is sized by font-size, and its `opsz` axis is meant to track
 *    that size — so each token sets both, which keeps stroke weight optically
 *    even across the scale instead of getting spindly at large sizes.
 */

const iconSizes = {
  /** For icons set inline with very small text (badges, pills). */
  "2xs": "text-[12px] [font-variation-settings:'opsz'_20]",
  xs: "text-[14px] [font-variation-settings:'opsz'_20]",
  sm: "text-[16px] [font-variation-settings:'opsz'_20]",
  md: "text-[18px] [font-variation-settings:'opsz'_20]",
  lg: "text-[20px] [font-variation-settings:'opsz'_24]",
  xl: "text-[24px] [font-variation-settings:'opsz'_24]",
  "2xl": "text-[32px] [font-variation-settings:'opsz'_40]",
  "3xl": "text-[48px] [font-variation-settings:'opsz'_48]",
} as const;

const iconTones = {
  /** Inherits the surrounding text colour. The default, and the right answer
   *  almost everywhere — including inside coloured alerts and badges. */
  inherit: "",
  /** Secondary/decorative icons that should sit back from their label. */
  muted: "text-muted-foreground",
  /** Reserved for deliberate brand emphasis. One accent, not five. */
  accent: "text-primary",
} as const;

export type IconSize = keyof typeof iconSizes;
export type IconTone = keyof typeof iconTones;

export interface IconProps extends Omit<React.ComponentProps<"span">, "children"> {
  /** Material Symbols ligature name, e.g. "calendar_month". */
  name: string;
  size?: IconSize;
  tone?: IconTone;
  /** Use the filled variant of the glyph. */
  filled?: boolean;
  /**
   * Accessible name. Provide it only when the icon carries meaning that no
   * adjacent text already conveys — an icon-only button, a standalone status
   * mark. Omit it for decoration and the icon is hidden from assistive tech,
   * which is what you want beside a visible label.
   */
  label?: string;
}

export function Icon({
  name,
  size = "md",
  tone = "inherit",
  filled = false,
  label,
  className,
  style,
  ...props
}: IconProps) {
  return (
    <span
      className={cn(
        "material-symbols-outlined shrink-0 select-none leading-none",
        iconSizes[size],
        iconTones[tone],
        className,
      )}
      style={filled ? { fontVariationSettings: "'FILL' 1", ...style } : style}
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": "true" })}
      {...props}
    >
      {name}
    </span>
  );
}
