export type BlendStep =
  | { kind: 'transfer'; step: number; liters: number; source: string; content: string; destination: string; movementCode: string | null }
  | { kind: 'addition'; step: number; text: string }

export interface BlendSteps { blendId: string | null; steps: BlendStep[] }

const TRANSFER = /^(\d+)\. Trasegar (\d+) L de (\S+) \((\S+)\) → (\S+) \(autorizar mezcla\)\.(?: Movimiento previsto (\S+))?$/
const ADDITION = /^(\d+)\. Añadir (.+) en \S+ tras la mezcla\.$/
const BLEND_ID = /Simulación BLEND:([0-9a-f-]{36})/

/** Reads the steps the simulator wrote into the description of the task it created (see BlendSimulationService). */
export function parseBlendSteps(description: string | null | undefined): BlendSteps {
  const text = description ?? ''
  const steps: BlendStep[] = []
  for (const line of text.split('\n').map((item) => item.trim())) {
    const transfer = TRANSFER.exec(line)
    if (transfer) {
      steps.push({ kind: 'transfer', step: Number(transfer[1]), liters: Number(transfer[2]), source: transfer[3], content: transfer[4], destination: transfer[5], movementCode: transfer[6] ?? null })
      continue
    }
    const addition = ADDITION.exec(line)
    if (addition) steps.push({ kind: 'addition', step: Number(addition[1]), text: addition[2] })
  }
  return { blendId: BLEND_ID.exec(text)?.[1] ?? null, steps }
}
