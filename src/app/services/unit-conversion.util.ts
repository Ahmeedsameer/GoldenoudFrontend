/**
 * Single source of truth for the kg/L ↔ g/ml "convenience unit" conversion
 * used by the product create/edit forms. Product.scalar and every quantity
 * tied to it (warning_quantity, critical_quantity, …) must always be stored
 * in the base unit (g/ml/pcs) — kg/l only ever exist as a data-entry/display
 * convenience on the form. This file is the only place that multiplies or
 * divides by 1000, so Add and Edit (same components) can never drift apart.
 */

const LARGE_UNIT_FACTOR = 1000;
const LARGE_TO_BASE: Record<string, string> = { kg: 'g', l: 'ml' };

/** kg→g, l→ml; anything else (g, ml, pcs) passes through unchanged. */
export function baseUnitOf(displayUnit: string): string {
  return LARGE_TO_BASE[displayUnit] ?? displayUnit;
}

/** Converts a quantity entered under `displayUnit` into its base-unit value for storage. */
export function toBaseQuantity(displayUnit: string, value: number | string | null | undefined): number | null {
  const num = toNumber(value);
  if (num === null) return null;
  const factor = LARGE_TO_BASE[displayUnit] ? LARGE_UNIT_FACTOR : 1;
  return round3(num * factor);
}

/** Converts a base-unit stored value into the given display unit for showing in the form. */
export function toDisplayQuantity(displayUnit: string, baseValue: number | string | null | undefined): number | null {
  const num = toNumber(baseValue);
  if (num === null) return null;
  const factor = LARGE_TO_BASE[displayUnit] ? LARGE_UNIT_FACTOR : 1;
  return round3(num / factor);
}

/**
 * Picks which unit to display a stored base-unit value in: the large unit
 * (kg/L) once any of the given quantities reaches 1000+, otherwise the base
 * unit itself. `pcs` has no large counterpart and always passes through.
 */
export function pickDisplayUnit(baseScalar: string, ...baseValues: Array<number | string | null | undefined>): string {
  if (baseScalar !== 'g' && baseScalar !== 'ml') return baseScalar;
  const max = baseValues
    .map(toNumber)
    .filter((v): v is number => v !== null)
    .reduce((a, b) => Math.max(a, b), 0);
  if (max >= LARGE_UNIT_FACTOR) {
    return baseScalar === 'g' ? 'kg' : 'l';
  }
  return baseScalar;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
