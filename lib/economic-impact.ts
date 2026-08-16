export type ImpactInputs = {
  floodProbability: number
  populationExposed: number
  householdsExposed: number
  businessesExposed: number
  croplandHectares: number
  infrastructureExposureNgn: number
  householdExposureNgn: number
  businessExposureNgn: number
  agricultureExposureNgn: number
  interventionCostNgn: number
  damageRatioWithoutAction?: number
  actionEffectiveness?: number
}

export type ImpactEstimate = {
  grossExposureNgn: number
  expectedLossWithoutActionNgn: number
  expectedLossWithActionNgn: number
  avoidableLossNgn: number
  interventionCostNgn: number
  benefitCostRatio: number | null
  netEconomicBenefitNgn: number
  populationExposed: number
  householdsExposed: number
  businessesExposed: number
  croplandHectares: number
  methodology: 'scenario-estimate'
  decisionUse: 'planning-only'
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Transparent planning estimate. This deliberately does not present scenario
 * values as observed losses. Production outputs must identify their exposure
 * datasets and calibrated vulnerability curves before being labelled validated.
 */
export function estimateEconomicImpact(input: ImpactInputs): ImpactEstimate {
  const probability = clamp(input.floodProbability, 0, 1)
  const damageRatio = clamp(input.damageRatioWithoutAction ?? 0.35, 0, 1)
  const effectiveness = clamp(input.actionEffectiveness ?? 0.30, 0, 1)

  const grossExposureNgn =
    Math.max(0, input.infrastructureExposureNgn) +
    Math.max(0, input.householdExposureNgn) +
    Math.max(0, input.businessExposureNgn) +
    Math.max(0, input.agricultureExposureNgn)

  const expectedLossWithoutActionNgn = grossExposureNgn * probability * damageRatio
  const avoidableLossNgn = expectedLossWithoutActionNgn * effectiveness
  const expectedLossWithActionNgn = expectedLossWithoutActionNgn - avoidableLossNgn
  const interventionCostNgn = Math.max(0, input.interventionCostNgn)

  return {
    grossExposureNgn,
    expectedLossWithoutActionNgn,
    expectedLossWithActionNgn,
    avoidableLossNgn,
    interventionCostNgn,
    benefitCostRatio: interventionCostNgn > 0 ? avoidableLossNgn / interventionCostNgn : null,
    netEconomicBenefitNgn: avoidableLossNgn - interventionCostNgn,
    populationExposed: Math.max(0, input.populationExposed),
    householdsExposed: Math.max(0, input.householdsExposed),
    businessesExposed: Math.max(0, input.businessesExposed),
    croplandHectares: Math.max(0, input.croplandHectares),
    methodology: 'scenario-estimate',
    decisionUse: 'planning-only',
  }
}
