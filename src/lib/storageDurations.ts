import type { LocationIcon } from '../types'

/**
 * Approximate storage durations in days per category and location type.
 * Used to auto-suggest expiry dates when adding items.
 */
export const STORAGE_DAYS: Partial<Record<string, Record<LocationIcon, number>>> = {
  Mejeri: { fridge: 7, freezer: 90, pantry: 1 },
  Kött: { fridge: 3, freezer: 120, pantry: 1 },
  'Fisk & skaldjur': { fridge: 2, freezer: 90, pantry: 1 },
  Grönsaker: { fridge: 7, freezer: 270, pantry: 3 },
  Frukt: { fridge: 7, freezer: 270, pantry: 5 },
  'Pasta & ris': { fridge: 3, freezer: 180, pantry: 365 },
  Bakning: { fridge: 5, freezer: 90, pantry: 30 },
  Frukost: { fridge: 14, freezer: 90, pantry: 180 },
  Konserver: { fridge: 7, freezer: 180, pantry: 730 },
  Snacks: { fridge: 7, freezer: 90, pantry: 90 },
  Dryck: { fridge: 14, freezer: 180, pantry: 365 },
  Skafferi: { fridge: 7, freezer: 180, pantry: 365 },
  'Såser & kryddor': { fridge: 14, freezer: 90, pantry: 365 },
  'Örter & kryddor': { fridge: 7, freezer: 180, pantry: 365 },
}

/**
 * Multiplier applied to storage days when an item is vacuum-packed.
 * Vacuum packing removes oxygen which slows oxidation and microbial growth,
 * extending shelf life roughly 4-6x (especially in the freezer).
 */
export const VACUUM_PACK_MULTIPLIER = 5

/**
 * Returns a suggested expiry Date given a category and location type.
 * If baseDate is provided (e.g. the date on the packaging), days are added on top of that.
 * Otherwise today is used as the base.
 */
export function suggestExpiryDate(
  category: string | undefined,
  locationType: LocationIcon | undefined,
  baseDate?: Date,
  vacuumPacked = false
): Date | null {
  if (!category || !locationType) return null
  let days = STORAGE_DAYS[category]?.[locationType]
  if (!days) return null
  if (vacuumPacked) days *= VACUUM_PACK_MULTIPLIER
  const date = new Date(baseDate ?? new Date())
  date.setDate(date.getDate() + days)
  return date
}
