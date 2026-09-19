import { useEffect, useState } from 'react'
import { LoginPage } from './pages/login-page'
import { WorkHomePage } from './features/work-home/pages/work-home-page'
import { CellarShell } from './features/cellar/components/cellar-shell'
import { DepositsPage } from './features/cellar/pages/deposits-page'
import { DepositDetailPage } from './features/cellar/pages/deposit-detail-page'
import { LotsPage } from './features/cellar/pages/lots-page'
import { MovementsPage } from './features/cellar/pages/movements-page'
import { MovementDetailPage } from './features/cellar/pages/movement-detail-page'
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
import { DashboardPage } from './features/dashboard/pages/dashboard-page'
import { IncidentsInboxPage } from './features/incidents/pages/incidents-inbox-page'
import { IncidentDetailPage } from './features/incidents/pages/incident-detail-page'
import { TasksPage } from './features/tasks/pages/tasks-page'
import { TaskDetailPage } from './features/tasks/pages/task-detail-page'
import { PlansPage } from './features/plans/pages/plans-page'
import { AccountPage, ActivityPage, AuditPage, ReportsPage, RulesPage } from './features/system/pages/system-pages'
import { AdministrationManagementPage } from './features/system/pages/administration-management-page'
import { OperationDetailPage } from './features/operations/pages/operation-detail-page'
import { clearAccessToken, hasActiveSession } from './services/api-client'

function getRoute(): string {
  return window.location.hash.slice(1) || 'home'
}

export function App() {
  const initialHash = getRoute()
  const [route, setRoute] = useState(() => {
    if (!hasActiveSession() && initialHash && initialHash !== 'login') sessionStorage.setItem('miriv:return-to', initialHash)
    return !hasActiveSession() ? 'login' : initialHash
  })
  const [cellarSearch, setCellarSearch] = useState('')

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    const handleExpiredSession = () => {
      clearAccessToken()
      const intended = getRoute()
      if (intended && intended !== 'login') sessionStorage.setItem('miriv:return-to', intended)
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

  if (route === 'login') return <LoginPage onLoginSuccess={() => { const next = sessionStorage.getItem('miriv:return-to'); sessionStorage.removeItem('miriv:return-to'); navigate(next && next !== 'login' ? next : 'home') }} />
  if (route === 'deposits' || (route.startsWith('deposits/') && !route.includes('/movement'))) return <CellarShell search={cellarSearch} onSearchChange={(value) => { setCellarSearch(value); if (route !== 'deposits' && value) navigate('deposits') }} activeSubsection="Depósitos" onNavigate={navigate}>{route === 'deposits' ? <DepositsPage search={cellarSearch} onOpenDeposit={openDeposit} /> : <DepositDetailPage code={decodeURIComponent(route.slice('deposits/'.length))} onBack={() => navigate('deposits')} onOpenLots={() => navigate('lots')} onOpenContent={openContent} onRegisterMovement={(code) => navigate(`deposits/${encodeURIComponent(code)}/movement`)} onRegisterSample={(code) => navigate(`laboratory/new/${encodeURIComponent(code)}`)} onRegisterEntry={(code) => navigate(`lots/new/${encodeURIComponent(code)}`)} />}</CellarShell>
  if (route.startsWith('deposits/') && route.includes('/movement')) { const code = decodeURIComponent(route.slice('deposits/'.length, route.indexOf('/movement'))); return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Depósitos" onNavigate={navigate}><MovementWizardPage sourceCode={code} onBack={() => openDeposit(code)} onSaved={(movementCode) => navigate(`movements/${encodeURIComponent(movementCode)}`)} /></CellarShell> }
  if (route === 'lots/new' || route.startsWith('lots/new/')) { const openFormForDeposit = decodeURIComponent(route.slice('lots/new/'.length)); return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Lotes" onNavigate={navigate}><LotsPage search={cellarSearch} onOpenLot={openLot} openFormForDeposit={openFormForDeposit || undefined} /></CellarShell> }
  if (route === 'lots' || route.startsWith('lots/')) return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Lotes" onNavigate={navigate}>{route === 'lots' ? <LotsPage search={cellarSearch} onOpenLot={openLot} /> : <LotDetailPage code={decodeURIComponent(route.slice('lots/'.length))} onBack={() => navigate('lots')} onOpenContent={openContent} />}</CellarShell>
  if (route === 'movements' || route.startsWith('movements/')) return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Movimientos" onNavigate={navigate}>{route === 'movements' ? <MovementsPage search={cellarSearch} onOpenMovement={(code) => navigate(`movements/${encodeURIComponent(code)}`)} /> : <MovementDetailPage code={decodeURIComponent(route.slice('movements/'.length))} onBack={() => navigate('movements')} />}</CellarShell>
  if (route.startsWith('contents/')) return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Contenidos" onNavigate={navigate}><ContentDetailPage code={decodeURIComponent(route.slice('contents/'.length))} onBack={() => navigate('deposits')} onOpenDeposit={openDeposit} onOpenLot={openLot} onOpenLaboratory={openLaboratory} onOpenTracking={(code) => navigate(`tracking/${encodeURIComponent(code)}`)} /></CellarShell>
  if (route === 'laboratory' || route === 'laboratory/new' || route.startsWith('laboratory/new/') || route === 'laboratory/import' || route.startsWith('laboratory/results/') || route.startsWith('laboratory/review/')) return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Laboratorio" onNavigate={navigate}>{route === 'laboratory' ? <LaboratoryInboxPage search={cellarSearch} onOpenContent={openContent} onCreateSample={() => navigate('laboratory/new')} onEnterResults={(code) => navigate(`laboratory/results/${encodeURIComponent(code)}`)} onReview={(code) => navigate(`laboratory/review/${encodeURIComponent(code)}`)} onImport={() => navigate('laboratory/import')} /> : (route === 'laboratory/new' || route.startsWith('laboratory/new/')) ? <SampleFormPage initialDeposit={route.startsWith('laboratory/new/') ? decodeURIComponent(route.slice('laboratory/new/'.length)) || undefined : undefined} onBack={() => navigate('laboratory')} onSaved={(code, introduceResults) => navigate(introduceResults ? `laboratory/results/${encodeURIComponent(code)}` : 'laboratory')} /> : route === 'laboratory/import' ? <ImportAnalysisPage onBack={() => navigate('laboratory')} /> : route.startsWith('laboratory/results/') ? <ResultsEntryPage code={decodeURIComponent(route.slice('laboratory/results/'.length))} onBack={() => navigate('laboratory')} onReview={(code) => navigate(`laboratory/review/${encodeURIComponent(code)}`)} /> : <AnalysisReviewPage code={decodeURIComponent(route.slice('laboratory/review/'.length))} onBack={() => navigate('laboratory')} />}</CellarShell>
  if (route === 'dashboard' || route.startsWith('dashboard/')) return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Seguimiento" onNavigate={navigate}><DashboardPage key={route} dashboardId={route.startsWith('dashboard/') ? decodeURIComponent(route.slice('dashboard/'.length)) : undefined} onNavigate={navigate} /></CellarShell>
  if (route === 'tracking') return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Seguimiento" onNavigate={navigate}><TrackingListPage onOpenCurves={(code) => navigate(`tracking/${encodeURIComponent(code)}`)} onCompare={(codes, parameters) => navigate(`tracking/compare?c=${codes.join(',')}&p=${parameters.join(',')}`)} /></CellarShell>
  if (route.startsWith('tracking/')) return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Seguimiento" onNavigate={navigate}><CurvesPage key={route} route={route} onBack={() => navigate('tracking')} onNavigate={navigate} /></CellarShell>
  if (route === 'incidents' || route.startsWith('incidents/')) return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Incidencias" onNavigate={navigate}>{route === 'incidents' ? <IncidentsInboxPage onOpen={(id) => navigate(`incidents/${encodeURIComponent(id)}`)} /> : <IncidentDetailPage id={decodeURIComponent(route.slice('incidents/'.length))} onBack={() => navigate('incidents')} onOpenContent={openContent} />}</CellarShell>
  if (route === 'tasks' || route.startsWith('tasks/')) return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Tareas" onNavigate={navigate}>{route === 'tasks' ? <TasksPage onOpen={(id) => navigate(`tasks/${encodeURIComponent(id)}`)} /> : <TaskDetailPage id={decodeURIComponent(route.slice('tasks/'.length))} onBack={() => navigate('tasks')} onOpenContent={openContent} onOpenLaboratory={openLaboratory} />}</CellarShell>
  if (route === 'plans') return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Elaboración" onNavigate={navigate}><PlansPage /></CellarShell>
  if (route === 'rules') return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Elaboración" onNavigate={navigate}><RulesPage /></CellarShell>
  if (route === 'reports') return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Informes" onNavigate={navigate}><ReportsPage /></CellarShell>
  if (route === 'admin') return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Administración" onNavigate={navigate}><AdministrationManagementPage /></CellarShell>
  if (route === 'audit') return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Administración" onNavigate={navigate}><AuditPage /></CellarShell>
  if (route === 'account') return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Administración" onNavigate={navigate}><AccountPage /></CellarShell>
  if (route === 'activity' || route.startsWith('activity/operations/')) return <CellarShell search={cellarSearch} onSearchChange={setCellarSearch} activeSubsection="Actividad" onNavigate={navigate}>{route === 'activity' ? <ActivityPage onOpenOperation={(id) => navigate(`activity/operations/${encodeURIComponent(id)}`)} /> : <OperationDetailPage id={decodeURIComponent(route.slice('activity/operations/'.length))} onBack={() => navigate('activity')} onOpenContent={openContent} />}</CellarShell>
  return <WorkHomePage onOpenLogin={() => navigate('login')} onNavigate={navigate} />
}
