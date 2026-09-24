import { useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { WineBackdrop } from '../components/login/wine-backdrop'
import { WineMark, renderedLevel } from '../components/login/wine-mark'
import type { MarkOrigin } from '../components/intro/brand-intro'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { authApi, type LoginResponse } from '../services/auth-api'

interface LoginForm {
  username: string
  password: string
}

interface BrandMarkProps {
  /** Wine in the glass: it rises as the credentials are typed. */
  level: number
  compact?: boolean
  /** The opening animation has taken the mark: hide this one. */
  handedOff?: boolean
}

function BrandMark({ compact = false, level, handedOff = false }: BrandMarkProps) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span data-login-mark style={{ visibility: handedOff ? 'hidden' : undefined }}><WineMark level={level} levelMs={600} size={compact ? 80 : 112} /></span>
      <span data-login-wordmark style={{ visibility: handedOff ? 'hidden' : undefined }} className={`${compact ? 'text-[32px]' : 'text-[48px]'} inline-block whitespace-nowrap font-display font-medium leading-none tracking-[0.22em] text-[#3d2f36]`}>MIRIV</span>
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
    <section className="w-full max-w-[440px] rounded-[22px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_-30px_rgba(70,40,55,0.45)] backdrop-blur-xl sm:p-8" aria-labelledby="login-title">
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

/** Viewport position of the visible login mark, where the opening animation starts. */
function loginMarkOrigin(): MarkOrigin | null {
  const visible = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)].find((node) => node.getBoundingClientRect().width > 0)?.getBoundingClientRect()
  const svg = [...document.querySelectorAll<SVGSVGElement>('[data-login-mark] svg')].find((node) => node.getBoundingClientRect().width > 0)
  const mark = svg?.getBoundingClientRect()
  const word = visible('[data-login-wordmark]')
  return mark ? { x: mark.x, y: mark.y, size: mark.width, level: renderedLevel(svg), word: word ? { x: word.x, y: word.y, width: word.width } : undefined } : null
}

/** Each field fills a quarter of the glass as it is typed (up to 8 characters): half full when both are in. */
function formLevel(form: LoginForm) {
  const part = (value: string) => Math.min(value.trim().length, 8) / 8
  return 25 * part(form.username) + 25 * part(form.password)
}

export function LoginPage({ onLoginSuccess }: { onLoginSuccess?: (from: MarkOrigin | null) => void }) {
  const [form, setForm] = useState<LoginForm>({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberSession, setRememberSession] = useState(true)
  const [loginState, setLoginState] = useState<'idle' | 'error' | 'success'>('idle')
  const [loginResponse, setLoginResponse] = useState<LoginResponse>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [failures, setFailures] = useState(0)
  // After a successful sign-in the card fades away first; then the opening animation takes the mark.
  const [leaving, setLeaving] = useState(false)
  // Once the opening animation has the mark, this one hides (same pixel, so the swap is invisible).
  const [handedOff, setHandedOff] = useState(false)

  const handleChange = (field: keyof LoginForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setLoginState('idle')
    setLoginResponse(undefined)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.username.trim() || !form.password) {
      setLoginResponse({ ok: false, message: 'Escribe tu usuario y tu contraseña.' })
      setLoginState('error')
      setFailures((count) => count + 1)
      return
    }
    setIsSubmitting(true)
    setLoginState('idle')

    try {
      const response = await authApi.login({ ...form, rememberSession })
      if (response.ok) {
        // The card fades away, then the opening animation takes the mark from here and carries it into the app.
        setLeaving(true)
        await new Promise((resolve) => setTimeout(resolve, 260))
        const origin = loginMarkOrigin()
        setHandedOff(true)
        onLoginSuccess?.(origin)
        return
      }
      setLoginResponse(response)
      setLoginState('error')
      setFailures((count) => count + 1)
    } catch (error) {
      setLoginResponse({ ok: false, message: error instanceof Error ? error.message : 'No se ha podido completar el acceso.' })
      setLoginState('error')
      setFailures((count) => count + 1)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRecovery = () => {
    setIsRecoveryOpen(true)
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-ink">
      <WineBackdrop />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1100px] items-center justify-center px-4 py-7 sm:px-8 lg:px-12">
        <div className="grid w-full max-w-[850px] items-center gap-8 lg:grid-cols-[320px_minmax(0,440px)] lg:gap-[56px]">
          <motion.div className="hidden lg:block" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <BrandMark level={formLevel(form)} handedOff={handedOff} />
            <motion.p animate={{ opacity: leaving ? 0 : 1 }} transition={{ duration: 0.25 }} className="mt-7 text-center text-[12px] tracking-wide text-[#6f5c66]">Seguimiento enológico claro y trazable</motion.p>
          </motion.div>

          <div className="flex w-full flex-col items-center gap-5">
            <motion.div className="lg:hidden" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}><BrandMark compact level={formLevel(form)} handedOff={handedOff} /></motion.div>
            {/* Card rises in on arrival; a failed attempt gives it a short shake. */}
            <motion.div key={failures} className="flex w-full justify-center" initial={failures ? false : { opacity: 0, y: 16 }}
              animate={leaving ? { opacity: 0, y: 8, scale: 0.98 } : failures ? { x: [0, -9, 8, -5, 4, 0] } : { opacity: 1, y: 0 }}
              transition={leaving ? { duration: 0.25, ease: 'easeIn' } : failures ? { duration: 0.45 } : { duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>
            <LoginCard form={form} showPassword={showPassword} rememberSession={rememberSession} loginState={loginState} loginResponse={loginResponse} isSubmitting={isSubmitting} onChange={handleChange} onTogglePassword={() => setShowPassword((current) => !current)} onToggleSession={setRememberSession} onSubmit={handleSubmit} onRecovery={handleRecovery} onHelp={() => setIsHelpOpen(true)} />
            </motion.div>
          </div>
        </div>
      </div>

      {isRecoveryOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-[#3d2f36]/25 px-6 py-8 backdrop-blur-[2px]" role="presentation" onMouseDown={() => setIsRecoveryOpen(false)}>
          <section className="w-full max-w-[420px] rounded-[24px] border border-border bg-white p-7 shadow-[0_24px_70px_-30px_rgba(61,47,54,0.55)] sm:p-9" role="dialog" aria-modal="true" aria-labelledby="recovery-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setIsRecoveryOpen(false)} className="mb-7 flex items-center gap-2 text-[13px] font-semibold text-plum hover:text-plum-dark"><ArrowLeft className="size-4" />Volver al acceso</button>
            <div className="mb-6 space-y-2">
              <h2 id="recovery-title" className="text-[25px] font-semibold tracking-[-0.02em]">Recuperar acceso</h2>
              <p className="text-[14px] leading-[1.6] text-copy">Para restablecer tu contraseña, contacta con el administrador de tu centro. Por seguridad, las contraseñas no se envían por correo.</p>
            </div>
            <button type="button" onClick={() => setIsRecoveryOpen(false)} className="flex h-[50px] w-full items-center justify-center rounded-[15px] bg-plum text-[15px] font-semibold text-[#fff8fb] transition hover:bg-plum-dark">Entendido</button>
          </section>
        </div>
      )}
      {isHelpOpen && <div className="fixed inset-0 z-10 flex items-center justify-center bg-[#3d2f36]/25 px-4 backdrop-blur-[2px]" onMouseDown={() => setIsHelpOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-[420px] rounded-[22px] border border-border bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><h2 id="help-title" className="text-[21px] font-semibold">Ayuda de acceso</h2><button type="button" onClick={() => setIsHelpOpen(false)} className="text-[12px] font-semibold text-plum">Cerrar</button></div><p className="mt-3 text-[13px] leading-5 text-copy">Las cuentas las gestiona el responsable del centro. Si no puedes acceder, contacta con esa persona o solicita recuperar tu contraseña.</p><button type="button" onClick={() => { setIsHelpOpen(false); handleRecovery() }} className="mt-3 text-[13px] font-semibold text-plum underline underline-offset-4">Recuperar contraseña</button></section></div>}
    </main>
  )
}
