import { useEffect, useState } from 'react'
import { LoginPage } from './pages/login-page'
import { WorkHomePage } from './features/work-home/pages/work-home-page'
import { CellarShell } from './features/cellar/components/cellar-shell'
import { DepositsPage } from './features/cellar/pages/deposits-page'
import { DepositDetailPage } from './features/cellar/pages/deposit-detail-page'
import { LotsPage } from './features/cellar/pages/lots-page'
import { ContentDetailPage } from './features/cellar/pages/content-detail-page'
import { LotDetailPage } from './features/cellar/pages/lot-detail-page'
import { MovementWizardPage } from './features/cellar/pages/movement-wizard-page'
import { LaboratoryInboxPage } from './features/laboratory/pages/laboratory-inbox-page'
import { SampleFormPage } from './features/laboratory/pages/sample-form-page'
import { ResultsEntryPage } from './features/laboratory/pages/results-entry-page'
import { AnalysisReviewPage } from './features/laboratory/pages/analysis-review-page'
import { ImportAnalysisPage } from './features/laboratory/pages/import-analysis-page'
import { CurvesPage } from './features/tracking/pages/curves-page'
import { TrackingListPage } from './features/tracking/pages/tracking-list-page'
import { IncidentsInboxPage } from './features/incidents/pages/incidents-inbox-page'
import { IncidentDetailPage } from './features/incidents/pages/incident-detail-page'
import { TasksPage } from './features/tasks/pages/tasks-page'
import { TaskDetailPage } from './features/tasks/pages/task-detail-page'
import { PlansPage } from './features/plans/pages/plans-page'
import { AccountPage, ActivityPage, AdministrationPage, AuditPage, ReportsPage, RulesPage } from './features/system/pages/system-pages'
import { OperationDetailPage } from './features/operations/pages/operation-detail-page'
import { apiMode } from './services/auth-api'
import { clearAccessToken, hasActiveSession } from './services/api-client'

function getRoute(): string {
  return window.location.hash.slice(1) || 'home'
}

export function App() {
  const [route, setRoute] = useState(() => apiMode === 'real' && !hasActiveSession() ? 'login' : getRoute())
  const [cellarSearch, setCellarSearch] = useState('')

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    const handleExpiredSession = () => {
      clearAccessToken()
      window.location.hash = 'login'
    }
    window.addEventListener('miriv:session-expired', handleExpiredSession)
    return () => window.removeEventListener('miriv:session-expired', handleExpiredSession)
  }, [])

  const navigate = (path: string) => {
    if (route.split('/')[0] !== path.split('/')[0]) setCellarSearch('')
    setRoute(path)
    window.location.hash = path
  }
  const openDeposit = (code: string) => navigate(`deposits/${encodeURIComponent(code)}`)
  const openContent = (code: string) => navigate(`contents/${encodeURIComponent(code)}`)
  const openLot = (code: string) => navigate(`lots/${encodeURIComponent(code)}`)
  const openLaboratory = (code?: string) => { navigate('laboratory'); setCellarSearch(code ?? '') }

  if (route === 'login') return <LoginPage onLoginSuccess={() => navigate('home')} />
  if (route === 'deposits' || (route.startsWith('deposits/') && !route.includes('/movement'))) return <CellarShell search={cellarSearch} onSearchChange={(value) => { setCellarSearch(value); if (route !== 'deposits' && value) navigate('deposits') }} activeSubsection="Depósitos" onNavigate={navigate}>{route === 'deposits' ? <DepositsPage search={cellarSearch} onOpenDeposit={openDeposit} /> : <DepositDetailPage code={decodeURIComponent(route.slice('deposits/'.length))} onBack={() => navigate('deposits')} onOpenLots={() => navigate('lots')} onOpenContent={openContent} onRegisterMovement={(code) => navigate(`deposits/${encodeURIComponent(code)}/movement`)} />}</CellarShell>
  if (route.startsWith('deposits/') && route.includes('/movement')) { const code = decodeURIComponent(route.slice('deposits/'.length, route.indexOf('/movement'))); return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Depósitos" onNavigate={navigate}><MovementWizardPage sourceCode={code} onBack={() => openDeposit(code)} onDone={() => openDeposit(code)} /></CellarShell> }
  if (route === 'lots' || route.startsWith('lots/')) return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Lotes" onNavigate={navigate}>{route === 'lots' ? <LotsPage search={cellarSearch} onOpenDeposit={openDeposit} onOpenLot={openLot} /> : <LotDetailPage code={decodeURIComponent(route.slice('lots/'.length))} onBack={() => navigate('lots')} onOpenContent={openContent} />}</CellarShell>
  if (route.startsWith('contents/')) return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Contenidos" onNavigate={navigate}><ContentDetailPage code={decodeURIComponent(route.slice('contents/'.length))} onBack={() => navigate('deposits')} onOpenDeposit={openDeposit} onOpenLot={openLot} onOpenLaboratory={openLaboratory} onOpenTracking={(code) => navigate(`tracking/${encodeURIComponent(code)}`)} /></CellarShell>
  if (route === 'laboratory' || route === 'laboratory/new' || route === 'laboratory/import' || route.startsWith('laboratory/results/') || route.startsWith('laboratory/review/')) return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Laboratorio" onNavigate={navigate}>{route === 'laboratory' ? <LaboratoryInboxPage search={cellarSearch} onOpenContent={openContent} onCreateSample={() => navigate('laboratory/new')} onEnterResults={(code) => navigate(`laboratory/results/${encodeURIComponent(code)}`)} onReview={(code) => navigate(`laboratory/review/${encodeURIComponent(code)}`)} onImport={() => navigate('laboratory/import')} /> : route === 'laboratory/new' ? <SampleFormPage onBack={() => navigate('laboratory')} onSaved={(code, introduceResults) => navigate(introduceResults ? `laboratory/results/${encodeURIComponent(code)}` : 'laboratory')} /> : route === 'laboratory/import' ? <ImportAnalysisPage onBack={() => navigate('laboratory')} /> : route.startsWith('laboratory/results/') ? <ResultsEntryPage code={decodeURIComponent(route.slice('laboratory/results/'.length))} onBack={() => navigate('laboratory')} onReview={(code) => navigate(`laboratory/review/${encodeURIComponent(code)}`)} /> : <AnalysisReviewPage code={decodeURIComponent(route.slice('laboratory/review/'.length))} onBack={() => navigate('laboratory')} />}</CellarShell>
  if (route === 'tracking') return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Seguimiento" onNavigate={navigate}><TrackingListPage onOpenCurves={(code) => navigate(`tracking/${encodeURIComponent(code)}`)} /></CellarShell>
  if (route.startsWith('tracking/')) return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Seguimiento" onNavigate={navigate}><CurvesPage contentCode={decodeURIComponent(route.slice('tracking/'.length))} onBack={() => window.history.back()} /></CellarShell>
  if (route === 'incidents' || route.startsWith('incidents/')) return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Incidencias" onNavigate={navigate}>{route === 'incidents' ? <IncidentsInboxPage onOpen={(id) => navigate(`incidents/${encodeURIComponent(id)}`)} /> : <IncidentDetailPage id={decodeURIComponent(route.slice('incidents/'.length))} onBack={() => navigate('incidents')} onOpenContent={openContent} />}</CellarShell>
  if (route === 'tasks' || route.startsWith('tasks/')) return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Tareas" onNavigate={navigate}>{route === 'tasks' ? <TasksPage onOpen={(id) => navigate(`tasks/${encodeURIComponent(id)}`)} /> : <TaskDetailPage id={decodeURIComponent(route.slice('tasks/'.length))} onBack={() => navigate('tasks')} onOpenContent={openContent} onOpenLaboratory={openLaboratory} />}</CellarShell>
  if (route === 'plans') return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Elaboración" onNavigate={navigate}><PlansPage /></CellarShell>
  if (route === 'rules') return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Elaboración" onNavigate={navigate}><RulesPage /></CellarShell>
  if (route === 'reports') return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Informes" onNavigate={navigate}><ReportsPage /></CellarShell>
  if (route === 'admin') return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Administración" onNavigate={navigate}><AdministrationPage /></CellarShell>
  if (route === 'audit') return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Administración" onNavigate={navigate}><AuditPage /></CellarShell>
  if (route === 'account') return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Administración" onNavigate={navigate}><AccountPage /></CellarShell>
  if (route === 'activity' || route.startsWith('activity/operations/')) return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Actividad" onNavigate={navigate}>{route === 'activity' ? <ActivityPage onOpenOperation={(id) => navigate(`activity/operations/${encodeURIComponent(id)}`)} /> : <OperationDetailPage id={decodeURIComponent(route.slice('activity/operations/'.length))} onBack={() => navigate('activity')} onOpenContent={openContent} />}</CellarShell>
  return <WorkHomePage onOpenLogin={() => navigate('login')} onNavigate={navigate} />
}
