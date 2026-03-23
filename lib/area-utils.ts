const HA_TO_AC = 2.47105;
const AC_TO_HA = 1 / HA_TO_AC;

export function convertArea(
  value: number,
  fromUnit: string,
  toUnit: string
): number {
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();

  if (from === to) return value;

  if (from === 'ha' && to === 'ac') return value * HA_TO_AC;
  if (from === 'ac' && to === 'ha') return value * AC_TO_HA;

  return value;
}

export function formatArea(
  value: number | null,
  sourceUnit: string | null,
  preferredUnit: string
): string {
  if (value == null || !sourceUnit) return '';

  const converted = convertArea(value, sourceUnit, preferredUnit);
  const formatted = converted.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
  return `${formatted} ${preferredUnit}`;
}
