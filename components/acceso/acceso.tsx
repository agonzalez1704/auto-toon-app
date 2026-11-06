import { useSignIn, useSignUp, useSSO } from '@clerk/clerk-expo'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import * as WebBrowser from 'expo-web-browser'
import { Fragment, useEffect, useState } from 'react'
import { Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { FONT, Text, TextInput } from '@/components/text'
import { theme } from '@/constants/theme'
import { CONFIG } from '@/lib/config'
import { useSignUpStore } from '@/stores/use-signup-store'

/**
 * Acceso, the web's phone board (design/maqueta/Acceso.dc.html): one door, no password.
 * A known email gets a sign-in code, a new one a sign-up code; Apple and Google through Clerk's SSO.
 * Every way in waits for the 18+ / terms box, as on the web. Sign-in and sign-up both render this.
 * Where to go after is AuthGate's call (app/_layout.tsx): a new account sees /welcome.
 */

WebBrowser.maybeCompleteAuthSession()

const C = theme.colors
// The door is the shop window (as the web's Acceso): red, white and the lime. On the red every small
// text is white — grey can't be read there — and an error is ink, since pink can't either.
const SOFT = C.text
const LINEA = 'rgba(253,253,255,0.4)'
const HERO = require('@/assets/images/acceso-hero.jpg')
const RESEND_S = 60
/** Where this device remembers the 18+ box was ticked, same key as the web's localStorage. */
const MAYOR_KEY = 'autotoon:mayor-de-edad'
const FALTA_MAYOR = 'Confirma que tienes 18 años o más y aceptas los términos para continuar.'
const CORREO_INVALIDO = 'Ese correo no parece válido. Revisa que esté completo.'
const CODIGO_INCORRECTO = 'El código no coincide. Revísalo o pide otro.'
const INCOMPLETA = 'Todavía no se puede crear la cuenta sólo con el correo. Entra con Apple o Google.'
const ACCESO = 'Intenta de nuevo, o entra con Apple o Google.'
// The board's funnel, with the app's step 2: balance is bought here (IAP), not a card on the web.
const FUNNEL = ['Cuenta', 'Saldo', 'Crear']

// Clerk codes in the customer's words (the web's lib/errores: CLERK → ERRORES).
const MENSAJES: Record<string, string> = {
  form_param_format_invalid: CORREO_INVALIDO,
  form_identifier_invalid: CORREO_INVALIDO,
  form_code_incorrect: CODIGO_INCORRECTO,
  verification_failed: CODIGO_INCORRECTO,
  verification_expired: 'Los códigos valen 10 minutos. Pide otro.',
  too_many_requests: 'Espera un minuto antes de volver a intentar.',
  form_password_pwned: INCOMPLETA,
  form_param_missing: INCOMPLETA,
}

const codes = (err: unknown): string[] => ((err as { errors?: { code?: string }[] })?.errors ?? []).map((e) => e?.code ?? '')
const notFound = (err: unknown) => codes(err).includes('form_identifier_not_found')

function mensaje(err: unknown, where: string): string {
  const hit = codes(err).find((c) => MENSAJES[c])
  if (hit) return MENSAJES[hit]
  console.error(`Acceso (${where}):`, err)
  return ACCESO
}

const abrir = (path: string) => WebBrowser.openBrowserAsync(`${CONFIG.API_BASE_URL.replace(/\/api\/?$/, '')}${path}`)

export function Acceso() {
  const insets = useSafeAreaInsets()
  const { startSSOFlow } = useSSO()
  const { isLoaded: inReady, signIn, setActive: setInActive } = useSignIn()
  const { isLoaded: upReady, signUp, setActive: setUpActive } = useSignUp()
  const markSignedUp = useSignUpStore((s) => s.setJustSignedUp)

  const [step, setStep] = useState<1 | 2>(1)
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mayor, setMayor] = useState(false)
  const [sentAt, setSentAt] = useState(0)
  const [now, setNow] = useState(0)

  useEffect(() => {
    AsyncStorage.getItem(MAYOR_KEY)
      .then((v) => v && setMayor(true))
      .catch(() => {})
  }, [])
  const confirmarMayor = (on: boolean) => {
    setMayor(on)
    if (on) setError(null)
    ;(on ? AsyncStorage.setItem(MAYOR_KEY, new Date().toISOString()) : AsyncStorage.removeItem(MAYOR_KEY)).catch(() => {})
  }

  // «Reenviar en 0:42»: tick only while waiting.
  useEffect(() => {
    if (step !== 2) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [step])
  const wait = Math.max(0, RESEND_S - Math.floor((now - sentAt) / 1000))

  const oauth = async (strategy: 'oauth_apple' | 'oauth_google') => {
    if (busy) return
    if (!mayor) return setError(FALTA_MAYOR)
    setBusy(true)
    setError(null)
    try {
      const res = await startSSOFlow({ strategy, unsafeMetadata: { mayorDeEdadConfirmado: new Date().toISOString() } })
      if (res.createdSessionId && res.setActive) {
        // useSSO transfers a first-time provider login into a sign-up: that is a new account.
        if (res.signUp?.createdSessionId) markSignedUp(true)
        await res.setActive({ session: res.createdSessionId })
      } else if (res.authSessionResult?.type === 'success') {
        setError(`No se completó la entrada con ${strategy === 'oauth_apple' ? 'Apple' : 'Google'}. Intenta de nuevo.`)
      } // cancelled in the sheet: nothing to say
    } catch (err) {
      setError(mensaje(err, strategy))
    } finally {
      setBusy(false)
    }
  }

  /** Sends a code: sign-in if the email has an account, sign-up if it's new. */
  const send = async () => {
    if (!inReady || !upReady || busy) return
    if (!mayor) return setError(FALTA_MAYOR)
    const address = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(address)) return setError(CORREO_INVALIDO)
    setBusy(true)
    setError(null)
    try {
      try {
        const attempt = await signIn.create({ identifier: address })
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === 'email_code')
        if (!factor || !('emailAddressId' in factor)) throw new Error('no email code')
        await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId })
        setMode('in')
      } catch (err) {
        if (!notFound(err)) throw err
        // The box above the buttons is the acceptance, and the age, on record with the account.
        await signUp.create({ emailAddress: address, legalAccepted: true, unsafeMetadata: { mayorDeEdadConfirmado: new Date().toISOString() } })
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
        setMode('up')
      }
      setCode('')
      setSentAt(Date.now())
      setNow(Date.now())
      setStep(2)
    } catch (err) {
      setError(mensaje(err, 'enviar_codigo'))
    } finally {
      setBusy(false)
    }
  }

  const verify = async (c: string) => {
    if (!inReady || !upReady || busy || c.length !== 6) return
    setBusy(true)
    setError(null)
    try {
      if (mode === 'in') {
        const attempt = await signIn.attemptFirstFactor({ strategy: 'email_code', code: c })
        if (attempt.status !== 'complete') throw new Error(attempt.status ?? 'incomplete')
        await setInActive({ session: attempt.createdSessionId })
      } else {
        const attempt = await signUp.attemptEmailAddressVerification({ code: c })
        if (attempt.status !== 'complete') {
          // The Clerk instance still asks for more than an email (e.g. a password).
          console.error('Acceso: sign-up missing', attempt.missingFields)
          return setError(INCOMPLETA)
        }
        markSignedUp(true)
        await setUpActive({ session: attempt.createdSessionId })
      }
    } catch (err) {
      setError(mensaje(err, 'verificar'))
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    if (!inReady || !upReady || wait > 0 || busy) return
    setBusy(true)
    setError(null)
    try {
      if (mode === 'in') {
        const factor = signIn.supportedFirstFactors?.find((f) => f.strategy === 'email_code')
        if (factor && 'emailAddressId' in factor) await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId })
      } else {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      }
      setSentAt(Date.now())
      setNow(Date.now())
    } catch (err) {
      setError(mensaje(err, 'reenviar'))
    } finally {
      setBusy(false)
    }
  }

  const onCode = (typed: string) => {
    const c = typed.replace(/\D/g, '').slice(0, 6)
    setCode(c)
    if (c.length === 6) verify(c)
  }

  // The board is drawn without a status bar: its 24pt top sits under the notch here, the photo grows with it.
  const top = Math.max(insets.top, 24)
  const current = Math.min(code.length, 5)

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={[s.page, { paddingTop: top, paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View pointerEvents="none" style={[s.hero, { height: 340 + top - 24 }]}>
          <Image source={HERO} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ left: '50%', top: '30%' }} />
          <LinearGradient colors={['rgba(10,10,10,0.35)', 'rgba(228,38,0,0)', C.rojo]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
        </View>

        <View style={s.header}>
          <Text style={s.brand}>Auto Toon</Text>
          <Text style={s.stepLabel}>{step === 1 ? 'PASO 1 DE 3 · CUENTA' : 'CÓDIGO · 1 DE 3'}</Text>
        </View>

        {step === 1 ? (
          <View style={s.section}>
            <View style={s.intro}>
              <Text style={s.eyebrow}>Valentina · generada con Auto Toon</Text>
              <Text style={s.h1}>Entra o crea tu cuenta</Text>
              <Text style={s.lead}>Una sola puerta. Si el correo es nuevo, creamos la cuenta; si no, entras.</Text>
            </View>

            <View style={s.stack}>
              <Pressable
                onPress={() => confirmarMayor(!mayor)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: mayor }}
                accessibilityLabel="Tengo 18 años o más y acepto los términos y el aviso de privacidad"
                style={s.check}
              >
                <View style={[s.box, mayor && s.boxOn]}>
                  {mayor ? (
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                      <Path d="M5 13l4 4L19 7" stroke={C.bg} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  ) : null}
                </View>
                <Text style={s.checkText}>
                  Tengo 18 años o más y acepto los{' '}
                  <Text style={s.link} onPress={() => abrir('/terms')}>términos</Text> y el{' '}
                  <Text style={s.link} onPress={() => abrir('/privacy')}>aviso de privacidad</Text>.
                </Text>
              </Pressable>

              {/* Tappable even before the box: tapping says why it waits (the web's aria-disabled). */}
              <Pressable style={[s.oauth, { opacity: mayor ? 1 : 0.5 }]} onPress={() => oauth('oauth_apple')} accessibilityRole="button" accessibilityState={{ disabled: busy || !mayor }}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill={C.text}>
                  <Path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.8 1.3 10.3.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.2ZM13.9 4.9c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.4-.6 3.1-1.5Z" />
                </Svg>
                <Text style={s.oauthText}>Continuar con Apple</Text>
              </Pressable>
              <Pressable style={[s.oauth, { opacity: mayor ? 1 : 0.5 }]} onPress={() => oauth('oauth_google')} accessibilityRole="button" accessibilityState={{ disabled: busy || !mayor }}>
                <Svg width={18} height={18} viewBox="0 0 48 48">
                  <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </Svg>
                <Text style={s.oauthText}>Continuar con Google</Text>
              </Pressable>
            </View>

            <View style={s.divider}>
              <View style={s.rule} />
              <Text style={s.dividerText}>o con tu correo</Text>
              <View style={s.rule} />
            </View>

            <View style={s.stack}>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Correo</Text>
                <TextInput
                  style={s.input}
                  placeholder="tu@marca.com"
                  placeholderTextColor={C.textDim}
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={send}
                  returnKeyType="go"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  accessibilityLabel="Correo"
                />
              </View>
              <Pressable style={[s.primary, { opacity: busy || !mayor ? 0.6 : 1 }]} onPress={send} accessibilityRole="button" accessibilityState={{ disabled: busy || !mayor }}>
                <Text style={s.primaryText}>{busy ? 'Enviando…' : 'Continuar'}</Text>
              </Pressable>
              <Text style={[s.note, s.center, error ? s.noteError : null]} accessibilityLiveRegion="polite">
                {error || 'Te mandamos un código de 6 dígitos. Sin contraseña.'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={s.section}>
            <View style={s.intro}>
              <Text style={s.h1}>Revisa tu correo</Text>
              <Text style={s.lead}>
                Mandamos un código a <Text style={s.leadEmail}>{email.trim()}</Text>. Vale 10 minutos.
              </Text>
            </View>

            {/* Six boxes drawn from one invisible input laid over them: a tap focuses it, the keyboard's autofill fills all six. */}
            <View style={s.digits}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={[s.digit, { borderColor: i === current ? C.accent : code[i] ? C.borderStrong : C.border }]}>
                  <Text style={s.digitText}>{code[i] ?? ''}</Text>
                </View>
              ))}
              <TextInput
                style={s.codeInput}
                value={code}
                onChangeText={onCode}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                autoFocus
                caretHidden
                accessibilityLabel="Código de 6 dígitos"
              />
            </View>

            <Pressable
              style={[s.primary, { opacity: busy || code.length !== 6 ? 0.6 : 1 }]}
              onPress={() => verify(code)}
              disabled={busy || code.length !== 6}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || code.length !== 6 }}
            >
              <Text style={s.primaryText}>{busy ? 'Entrando…' : 'Entrar'}</Text>
            </Pressable>

            <View style={s.row}>
              <Pressable style={s.textBtn} onPress={resend} disabled={wait > 0 || busy} accessibilityRole="button" accessibilityState={{ disabled: wait > 0 || busy }}>
                <Text style={[s.textBtnText, { color: wait > 0 ? 'rgba(253,253,255,0.75)' : C.text }]}>
                  {wait > 0 ? 'Reenviar en ' : 'Reenviar código'}
                  {wait > 0 ? <Text style={s.mono}>{`${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, '0')}`}</Text> : null}
                </Text>
              </Pressable>
              <Pressable
                style={s.textBtn}
                onPress={() => {
                  setStep(1)
                  setCode('')
                  setError(null)
                }}
                accessibilityRole="button"
              >
                <Text style={[s.textBtnText, { color: C.text }]}>Cambiar correo</Text>
              </Pressable>
            </View>

            <Text style={[s.note, error ? s.noteError : null]} accessibilityLiveRegion="polite">
              {error || '¿No llega? Revisa spam o usa Apple / Google. Nunca te pediremos el código por chat ni por teléfono.'}
            </Text>
          </View>
        )}

        <View style={s.foot}>
          <View style={s.funnel}>
            {FUNNEL.map((label, i) => (
              <Fragment key={label}>
                <View style={s.funnelStep}>
                  <View style={[s.funnelDot, i === 0 && s.funnelDotOn]}>
                    <Text style={[s.funnelN, i === 0 && { color: C.bg }]}>{i + 1}</Text>
                  </View>
                  <Text style={[s.funnelLabel, i === 0 && { color: C.text }]}>{label}</Text>
                </View>
                <View style={[s.funnelLine, i === FUNNEL.length - 1 && { backgroundColor: 'transparent' }]} />
              </Fragment>
            ))}
          </View>
          {/* The board says the card is added on the web; in the iPhone app that would point outside the App Store's purchase, and the balance is bought here. */}
          <Text style={s.small}>Pagas por lo que generas. Sin mensualidad, sin prueba gratis: para generar necesitas saldo, que cargas aquí mismo.</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.rojo },
  page: { flexGrow: 1, paddingHorizontal: 20 },
  hero: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontFamily: FONT.display, fontSize: 22, lineHeight: 22, textTransform: 'uppercase', color: C.text },
  stepLabel: { fontFamily: FONT.mono, fontSize: 11, color: SOFT },

  section: { gap: 16, marginTop: 196 },
  intro: { gap: 8 },
  eyebrow: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: SOFT },
  h1: { fontFamily: FONT.display, fontSize: 44, lineHeight: 44, textTransform: 'uppercase', color: C.text },
  lead: { fontSize: 14, lineHeight: 21, color: C.text },
  leadEmail: { fontFamily: FONT.mono, fontSize: 13, color: C.text },
  stack: { gap: 10 },

  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  box: { width: 18, height: 18, marginTop: 1, borderRadius: 4, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.bgRaised, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.accent, borderColor: C.accent },
  checkText: { flex: 1, fontSize: 13, lineHeight: 19, color: SOFT },
  link: { color: C.text, textDecorationLine: 'underline' },

  oauth: { minHeight: 50, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  oauthText: { fontSize: 15, fontWeight: '500', color: C.text },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { flex: 1, height: 1, backgroundColor: LINEA },
  dividerText: { fontSize: 12, color: C.text },

  field: { gap: 6 },
  fieldLabel: { fontSize: 13, color: C.text },
  input: { minHeight: 50, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgRaised, color: C.text, fontSize: 16 },
  primary: { minHeight: 52, borderRadius: 999, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 16, fontWeight: '600', color: C.bg },
  note: { fontSize: 12.5, lineHeight: 19, color: C.text },
  center: { textAlign: 'center' },
  noteError: { color: C.bg },

  digits: { flexDirection: 'row', gap: 8 },
  digit: { flex: 1, height: 60, borderRadius: 14, borderWidth: 1, backgroundColor: C.bgRaised, alignItems: 'center', justifyContent: 'center' },
  digitText: { fontFamily: FONT.mono, fontSize: 24, color: C.text },
  codeInput: { ...StyleSheet.absoluteFillObject, opacity: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  textBtn: { minHeight: 44, justifyContent: 'center' },
  textBtnText: { fontSize: 13 },
  mono: { fontFamily: FONT.mono },

  // margin-top: auto as on the board; the padding only matters when a short screen scrolls.
  foot: { marginTop: 'auto', paddingTop: 24, gap: 12 },
  funnel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  funnelStep: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  funnelDot: { width: 18, height: 18, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(253,253,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  funnelDotOn: { backgroundColor: C.accent, borderColor: C.accent },
  funnelN: { fontFamily: FONT.mono, fontSize: 10, color: C.text },
  funnelLabel: { fontSize: 11.5, color: C.text },
  funnelLine: { flex: 1, height: 1, backgroundColor: LINEA },
  small: { fontSize: 12, lineHeight: 18, color: C.text },
})
