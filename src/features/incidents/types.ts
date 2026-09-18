export type IncidentPriority = 'Crítica' | 'Alta' | 'Media'
export type IncidentStatus = 'active' | 'monitoring' | 'closed'
export type IncidentResolution = 'Resuelta' | 'Descartada'

export interface IncidentEvidencePoint {
  date: string
  value: string
  method: string
  source: string
  flagged?: boolean
}

export interface IncidentHistoryEntry {
  date: string
  note: string
}

export interface Incident {
  id: string
  priority: IncidentPriority
  status: IncidentStatus
  title: string
  contentCode: string
  lotCode: string
  depositCode: string
  lastEvidence: string
  openedAgo: string
  responsible?: string
  responsibleUsername?: string
  silencedUntil?: string
  ruleName?: string
  ruleVersion?: string
  reasonDetail: string
  detectedAt: string
  trend?: string
  missingData?: string
  evidence: IncidentEvidencePoint[]
  recommendation?: string
  associatedTask?: { title: string; detail: string }
  history: IncidentHistoryEntry[]
  resolution?: IncidentResolution
  resolutionReason?: string
}

export interface ResolveIncidentInput {
  resolution: IncidentResolution
  reason: string
}
