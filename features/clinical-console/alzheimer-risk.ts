/**
 * Literature-based Alzheimer risk estimate: age baseline (prior) updated by the measured FAZ (likelihood ratio).
 * Not a validated classifier; accuracy has not been measured on patients with known diagnoses.
 */

// Share of people with Alzheimer's dementia by age, Alzheimer's Association 2024 Facts and Figures (US).
const AGE_BASELINE: readonly (readonly [minAge: number, prevalence: number, label: string])[] = [
  [85, 0.333, "85+"],
  [75, 0.131, "75–84"],
  [65, 0.05, "65–74"],
  // Derived: young-onset dementia at 60–64 in high-income countries 663.9/100,000 (Hendriks et al., JAMA Neurol 2021)
  // × Alzheimer share of young-onset dementia 41.1/119.0 ≈ 0.23%.
  [60, 0.0023, "60–64"],
];
export const RISK_AGE_GROUPS = AGE_BASELINE.map(([minAge, prevalence, label]) => ({ minAge, prevalence, label })).reverse();
// Same constants as the backend FAZ index (backend/app/octa_pipeline.py): Alzheimer FAZ shift of 0.54 SD.
const FAZ_AD_SMD = 0.54;

export type AlzheimerRiskEstimate = {
  baseline: number; // 0–1, age-group prevalence
  ageGroup: string;
  likelihoodRatio: number; // how much the measured FAZ multiplies the odds
  risk: number; // 0–1, baseline updated by the FAZ
};

/** null when age is outside the published baselines (under 60) or the FAZ was not measured. */
export function estimateAlzheimerRisk(age: number, fazZ: number | null | undefined): AlzheimerRiskEstimate | null {
  if (fazZ == null || !Number.isFinite(fazZ) || !Number.isFinite(age)) return null;
  const row = AGE_BASELINE.find(([min]) => age >= min);
  if (!row) return null;
  const [, baseline, ageGroup] = row;
  const z = Math.max(-3, Math.min(3, fazZ));
  // Two normal groups with equal SD, means 0 (controls) and FAZ_AD_SMD (Alzheimer): density ratio at z.
  const likelihoodRatio = Math.exp(FAZ_AD_SMD * z - FAZ_AD_SMD ** 2 / 2);
  const odds = (baseline / (1 - baseline)) * likelihoodRatio;
  return { baseline, ageGroup, likelihoodRatio, risk: odds / (1 + odds) };
}
