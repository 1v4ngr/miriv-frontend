import { useState, type FormEvent } from 'react'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { authApi, type LoginResponse } from '../services/auth-api'

interface LoginForm {
  username: string
  password: string
}

interface BrandMarkProps {
  compact?: boolean
}

function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className={`${compact ? 'size-20' : 'size-28'} flex items-center justify-center rounded-full border border-[#dcc8d4] bg-white shadow-[0_16px_36px_-28px_rgba(70,40,55,0.5)]`}>
        <span className={`${compact ? 'text-[44px]' : 'text-[60px]'} font-display font-medium leading-none text-plum`}>M</span>
      </div>
      <div className={`${compact ? 'text-[32px]' : 'text-[48px]'} font-display font-medium leading-none tracking-[0.22em] text-[#3d2f36]`}>MIRIV</div>
    </div>
  )
}

interface StatusNoticeContentProps {
  message: string
  attemptsRemaining?: number
}

function StatusNoticeContent({ message, attemptsRemaining }: StatusNoticeContentProps) {
  return (
    <div className="flex items-start gap-2 text-[12.5px] leading-5 text-[#8e3b4a]" role="alert">
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#c0596a]" aria-hidden="true" />
      <span>{message}{attemptsRemaining === undefined ? '' : ` Quedan ${attemptsRemaining} intentos.`}</span>
    </div>
  )
}

function SuccessNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 text-[12.5px] leading-5 text-[#1f5c3a]" role="status">
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#1f5c3a]" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

interface PasswordFieldProps {
  value: string
  visible: boolean
  errorMessage?: string
  attemptsRemaining?: number
  onChange: (value: string) => void
  onToggleVisibility: () => void
}

function PasswordField({ value, visible, errorMessage, attemptsRemaining, onChange, onToggleVisibility }: PasswordFieldProps) {
  const hasError = Boolean(errorMessage)

  return (
    <div className="space-y-2">
      <label className="block text-[12.5px] font-semibold text-copy" htmlFor="password">Contraseña</label>
      <div className={`flex h-12 items-center gap-3 rounded-[14px] bg-white px-4 transition-colors ${hasError ? 'border-[1.5px] border-[#c0596a]' : 'border border-[#e0d2d9] focus-within:border-[#b9899c] focus-within:ring-4 focus-within:ring-[#f3e7ee]'}`}>
        <LockKeyhole className="size-4 shrink-0 text-[#a48b97]" aria-hidden="true" />
        <input
          id="password"
          name="password"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Contraseña"
          autoComplete="current-password"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-[#7b6d74]"
          aria-invalid={hasError}
          aria-describedby={hasError ? 'login-error' : undefined}
        />
        <button type="button" onClick={onToggleVisibility} className="shrink-0 text-[12px] font-semibold text-plum hover:text-plum-dark" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          <span className="sr-only">{visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}</span>
        </button>
      </div>
      {hasError && <div id="login-error"><StatusNoticeContent message={errorMessage ?? 'No se ha podido completar el acceso.'} attemptsRemaining={attemptsRemaining} /></div>}
    </div>
  )
}

interface SessionToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

function SessionToggle({ checked, onChange }: SessionToggleProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[14px] text-ink">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span aria-hidden="true" className={`relative h-[27px] w-[46px] shrink-0 rounded-full p-[3px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#c99aad] peer-focus-visible:ring-offset-2 ${checked ? 'bg-plum' : 'bg-[#e0d2d9]'}`}>
        <span className={`block size-[21px] rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[19px]' : 'translate-x-0'}`} />
      </span>
      <span className="peer-focus-visible:rounded-sm">Mantener la sesión en este equipo</span>
    </label>
  )
}

interface LoginCardProps {
  form: LoginForm
  showPassword: boolean
  rememberSession: boolean
  loginState: 'idle' | 'error' | 'success'
  loginResponse?: LoginResponse
  isSubmitting: boolean
  onChange: (field: keyof LoginForm, value: string) => void
  onTogglePassword: () => void
  onToggleSession: (checked: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onRecovery: () => void
  onHelp: () => void
}

function LoginCard({ form, showPassword, rememberSession, loginState, loginResponse, isSubmitting, onChange, onTogglePassword, onToggleSession, onSubmit, onRecovery, onHelp }: LoginCardProps) {
  const hasError = loginState === 'error'

  return (
    <section className="w-full max-w-[440px] rounded-[22px] border border-border bg-white p-6 shadow-[0_18px_40px_-28px_rgba(70,40,55,0.45)] sm:p-8" aria-labelledby="login-title">
      <div className="mb-5 space-y-1.5">
        <h1 id="login-title" className="text-[24px] font-semibold tracking-[-0.02em]">Acceder</h1>
        <p className="text-[14px] leading-[1.6] text-copy">Usa la cuenta que te ha facilitado la cooperativa.</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <label className="block text-[12.5px] font-semibold text-copy" htmlFor="username">Usuario o correo</label>
          <div className="flex h-12 items-center gap-3 rounded-[14px] border border-[#e0d2d9] bg-field px-4 transition-colors focus-within:border-[#b9899c] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#f3e7ee]">
            <Mail className="size-4 shrink-0 text-[#a48b97]" aria-hidden="true" />
            <input id="username" name="username" type="text" value={form.username} onChange={(event) => onChange('username', event.target.value)} autoComplete="username" className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-[#7b6d74]" placeholder="usuario@cooperativa.es" />
          </div>
        </div>

        <PasswordField value={form.password} visible={showPassword} errorMessage={hasError ? loginResponse?.message : undefined} attemptsRemaining={hasError ? loginResponse?.attemptsRemaining : undefined} onChange={(value) => onChange('password', value)} onToggleVisibility={onTogglePassword} />
        <SessionToggle checked={rememberSession} onChange={onToggleSession} />

        <button type="submit" disabled={isSubmitting} className="flex h-[50px] w-full items-center justify-center rounded-[15px] bg-plum text-[15px] font-semibold text-[#fff8fb] shadow-[0_10px_22px_-14px_rgba(109,70,86,0.9)] transition-all hover:bg-plum-dark hover:shadow-[0_14px_28px_-14px_rgba(109,70,86,0.9)] active:translate-y-px disabled:cursor-wait disabled:opacity-70">
          {isSubmitting ? 'Comprobando…' : 'Entrar'}
        </button>

        {loginState === 'success' && loginResponse?.message && <SuccessNotice message={loginResponse.message} />}

        <div className="flex items-center justify-between gap-4 text-[13px]">
          <button type="button" onClick={onRecovery} className="font-semibold text-plum underline decoration-transparent underline-offset-4 transition hover:text-plum-dark hover:decoration-current">¿No recuerdas la contraseña?</button>
          <button type="button" onClick={onHelp} className="shrink-0 text-muted underline decoration-[#c9b9c1] underline-offset-4 hover:text-plum-dark">Ayuda de acceso</button>
        </div>
      </form>

      <div className="mt-[22px] border-t border-[#efe6ea] pt-4 text-[12.5px] leading-[1.55] text-muted">Las cuentas las gestiona el responsable del centro. No hay registro público.</div>
    </section>
  )
}

export function LoginPage({ onLoginSuccess }: { onLoginSuccess?: () => void }) {
  const [form, setForm] = useState<LoginForm>({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberSession, setRememberSession] = useState(true)
  const [loginState, setLoginState] = useState<'idle' | 'error' | 'success'>('idle')
  const [loginResponse, setLoginResponse] = useState<LoginResponse>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [recoverySent, setRecoverySent] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [isRecoverySubmitting, setIsRecoverySubmitting] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')

  const handleChange = (field: keyof LoginForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setLoginState('idle')
    setLoginResponse(undefined)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setLoginState('idle')

    try {
      const response = await authApi.login({ ...form, rememberSession })
      if (response.ok) {
        onLoginSuccess?.()
        return
      }
      setLoginResponse(response)
      setLoginState('error')
    } catch (error) {
      setLoginResponse({ ok: false, message: error instanceof Error ? error.message : 'No se ha podido completar el acceso.' })
      setLoginState('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRecovery = () => {
    setIsRecoveryOpen(true)
    setRecoverySent(false)
    setRecoveryError('')
    setRecoveryEmail(form.username)
  }

  const handleRecoverySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsRecoverySubmitting(true)
    setRecoveryError('')

    try {
      const response = await authApi.requestPasswordReset({ usernameOrEmail: recoveryEmail })
      if (!response.ok) {
        setRecoveryError(response.message)
        return
      }
      setRecoverySent(true)
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : 'No se ha podido solicitar la recuperación.')
    } finally {
      setIsRecoverySubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(150deg,#f7f0f4_0%,#f2eef1_45%,#efe9f0_100%)] text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[1100px] items-center justify-center px-4 py-7 sm:px-8 lg:px-12">
        <div className="grid w-full max-w-[850px] items-center gap-8 lg:grid-cols-[320px_minmax(0,440px)] lg:gap-[56px]">
          <div className="hidden lg:block">
            <BrandMark />
            <p className="mt-7 text-center text-[12px] text-muted">Seguimiento enológico claro y trazable</p>
          </div>

          <div className="flex w-full flex-col items-center gap-5">
            <div className="lg:hidden"><BrandMark compact /></div>
            <LoginCard form={form} showPassword={showPassword} rememberSession={rememberSession} loginState={loginState} loginResponse={loginResponse} isSubmitting={isSubmitting} onChange={handleChange} onTogglePassword={() => setShowPassword((current) => !current)} onToggleSession={setRememberSession} onSubmit={handleSubmit} onRecovery={handleRecovery} onHelp={() => setIsHelpOpen(true)} />
          </div>
        </div>
      </div>

      {isRecoveryOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-[#3d2f36]/25 px-6 py-8 backdrop-blur-[2px]" role="presentation" onMouseDown={() => setIsRecoveryOpen(false)}>
          <section className="w-full max-w-[420px] rounded-[24px] border border-border bg-white p-7 shadow-[0_24px_70px_-30px_rgba(61,47,54,0.55)] sm:p-9" role="dialog" aria-modal="true" aria-labelledby="recovery-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setIsRecoveryOpen(false)} className="mb-7 flex items-center gap-2 text-[13px] font-semibold text-plum hover:text-plum-dark"><ArrowLeft className="size-4" />Volver al acceso</button>
            <div className="mb-6 space-y-2">
              <h2 id="recovery-title" className="text-[25px] font-semibold tracking-[-0.02em]">Recuperar acceso</h2>
              <p className="text-[14px] leading-[1.6] text-copy">Te enviaremos las instrucciones al correo asociado a tu cuenta.</p>
            </div>
            {recoverySent ? (
              <div className="rounded-[15px] bg-[#dceadf] p-4 text-[13px] leading-5 text-[#1f5c3a]" role="status">Si existe una cuenta asociada, recibirás un correo con los siguientes pasos.</div>
            ) : (
              <form className="space-y-4" onSubmit={handleRecoverySubmit}>
                <div className="space-y-2">
                  <label className="block text-[12.5px] font-semibold text-copy" htmlFor="recovery-email">Usuario o correo</label>
                  <input id="recovery-email" type="email" required value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} className="h-12 w-full rounded-[14px] border border-[#e0d2d9] bg-field px-4 text-[15px] outline-none transition focus:border-[#b9899c] focus:bg-white focus:ring-4 focus:ring-[#f3e7ee]" />
                </div>
                {recoveryError && <div className="text-[12.5px] text-[#8e3b4a]" role="alert">{recoveryError}</div>}
                <button type="submit" disabled={isRecoverySubmitting} className="flex h-[50px] w-full items-center justify-center rounded-[15px] bg-plum text-[15px] font-semibold text-[#fff8fb] transition hover:bg-plum-dark disabled:cursor-wait disabled:opacity-70">{isRecoverySubmitting ? 'Enviando…' : 'Enviar instrucciones'}</button>
              </form>
            )}
          </section>
        </div>
      )}
      {isHelpOpen && <div className="fixed inset-0 z-10 flex items-center justify-center bg-[#3d2f36]/25 px-4 backdrop-blur-[2px]" onMouseDown={() => setIsHelpOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-[420px] rounded-[22px] border border-border bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><h2 id="help-title" className="text-[21px] font-semibold">Ayuda de acceso</h2><button type="button" onClick={() => setIsHelpOpen(false)} className="text-[12px] font-semibold text-plum">Cerrar</button></div><p className="mt-3 text-[13px] leading-5 text-copy">Las cuentas las gestiona el responsable del centro. Si no puedes acceder, contacta con esa persona o solicita recuperar tu contraseña.</p><button type="button" onClick={() => { setIsHelpOpen(false); handleRecovery() }} className="mt-3 text-[13px] font-semibold text-plum underline underline-offset-4">Recuperar contraseña</button></section></div>}
    </main>
  )
}
