import type { Lang } from "@/i18n/translations";

/**
 * Returns the localized value of a field.
 * For Portuguese, tries `field_pt` first; falls back to the base field (Spanish).
 */
export function localized(
  row: any,
  field: string,
  lang: Lang
): string {
  if (lang === "pt") {
    const ptVal = row[`${field}_pt`];
    if (ptVal && typeof ptVal === "string" && ptVal.trim().length > 0) return ptVal;
  }
  const val = row[field];
  return typeof val === "string" ? val : "";
}
