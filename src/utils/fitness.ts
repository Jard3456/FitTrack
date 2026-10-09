export function parseMeasurement(value: string) {
  const normalized = value.trim().replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeHeightInMeters(value: string) {
  const parsedHeight = parseMeasurement(value);
  if (parsedHeight === null || parsedHeight <= 0) return null;

  // A value greater than 3 is treated as centimeters (for example, 175).
  return parsedHeight > 3 ? parsedHeight / 100 : parsedHeight;
}

export function calculateBmi(weight: string, height: string) {
  const parsedWeight = parseMeasurement(weight);
  const heightInMeters = normalizeHeightInMeters(height);

  if (
    parsedWeight === null ||
    parsedWeight <= 0 ||
    heightInMeters === null
  ) {
    return null;
  }

  return parsedWeight / (heightInMeters * heightInMeters);
}

export function formatBmi(weight: string, height: string) {
  const bmi = calculateBmi(weight, height);
  return bmi === null ? null : bmi.toFixed(1);
}

export function calculateWeightProgress(
  currentWeight: string,
  targetWeight: string,
  startingWeight: string
) {
  const current = parseMeasurement(currentWeight);
  const target = parseMeasurement(targetWeight);
  const starting = parseMeasurement(startingWeight);

  if (current === null || target === null || starting === null) return null;
  if (starting === target) return current === target ? 1 : 0;

  const progress = starting > target
    ? (starting - current) / (starting - target)
    : (current - starting) / (target - starting);

  return Math.min(1, Math.max(0, progress));
}
