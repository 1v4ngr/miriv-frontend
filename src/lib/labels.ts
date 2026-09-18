// F2-03: single source of truth for wire codes coming from the backend. The backend now
// sends stable tokens (NOT_EVALUATED, PLANNED, URGENT_INCIDENTS, ...) and this module
// maps them to localized Spanish labels. Everything falls back to "—" when the code is
// null/empty/unknown so missing data never blows up the UI.

export const fermentationLabels: Record<string, string> = {
  NOT_EVALUATED: 'Sin evaluar',
  NOT_EVALUABLE: 'No evaluable',
  NOT_STARTED: 'No iniciada',
  ACTIVE: 'Activa',
  SLOW: 'Lenta',
  SUSPECTED_STOP: 'Sospecha de parada',
  FINISHED: 'Finalizada',
  NOT_EXPECTED: 'No prevista',
}

export const intentLabels: Record<string, string> = {
  PLANNED: 'Prevista',
  NOT_DESIRED: 'No deseada',
  PENDING_DECISION: 'Pendiente de decisión',
}

export const metricLabels: Record<string, string> = {
  URGENT_INCIDENTS: 'Incidencias urgentes',
  OVERDUE_CONTROLS: 'Controles vencidos',
  PENDING_VALIDATIONS: 'Validaciones pendientes',
}

export const fermentationMixtureStateLabels: Record<string, string> = {
  // Backwards-compat: some older screens still get the raw enologist confirmation text
  // (Activa, Lenta, ...) — pass them through.
  Activa: 'Activa',
  Lenta: 'Lenta',
  'Sospecha de parada': 'Sospecha de parada',
  Finalizada: 'Finalizada',
  'No iniciada': 'No iniciada',
  'No prevista': 'No prevista',
}

export const label = (
  map: Record<string, string>,
  value: string | null | undefined,
  fallback = '—',
): string => (value ? map[value] ?? value : fallback)
