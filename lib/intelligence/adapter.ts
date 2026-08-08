import { CanonicalObservation, SourceKind } from "./types";

export interface AdapterContext {
  receivedAt?: Date;
}

export interface FloodDataAdapter<T = unknown> {
  id: string;
  provider: string;
  sourceKind: SourceKind;
  describe(): {
    id: string;
    provider: string;
    sourceKind: SourceKind;
    purpose: string;
  };
  adapt(payload: T, context?: AdapterContext): Promise<CanonicalObservation[]> | CanonicalObservation[];
}

export interface AdapterResult {
  adapterId: string;
  accepted: number;
  rejected: number;
  observations: CanonicalObservation[];
  errors: Array<{ index: number; message: string }>;
}

export async function runAdapter<T>(
  adapter: FloodDataAdapter<T>,
  payloads: T[],
  context?: AdapterContext
): Promise<AdapterResult> {
  const observations: CanonicalObservation[] = [];
  const errors: Array<{ index: number; message: string }> = [];

  for (let i = 0; i < payloads.length; i++) {
    try {
      const output = await adapter.adapt(payloads[i], context);
      observations.push(...output);
    } catch (error) {
      errors.push({
        index: i,
        message: error instanceof Error ? error.message : "Unknown adapter error",
      });
    }
  }

  return {
    adapterId: adapter.id,
    accepted: observations.length,
    rejected: errors.length,
    observations,
    errors,
  };
}
