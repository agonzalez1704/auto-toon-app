/**
 * Saves after a pause in typing. One save at a time, always of the newest value: an older answer can never land
 * after a newer one. Pure and client-safe.
 */
export function createAutoguardado<T>(guardar: (v: T) => Promise<unknown>, pausaMs: number) {
    let pendiente: { v: T } | null = null
    let reloj: ReturnType<typeof setTimeout> | null = null
    let guardando = false
    let termina: Promise<void> = Promise.resolve()

    const quitarReloj = () => {
        if (reloj) clearTimeout(reloj)
        reloj = null
    }

    const drenar = async () => {
        while (pendiente) {
            const { v } = pendiente
            pendiente = null
            // The caller reports its own failures; a failed save must not stop the next one.
            await guardar(v).catch(() => {})
        }
        guardando = false
    }

    const arrancar = () => {
        if (guardando || !pendiente) return termina
        guardando = true
        termina = drenar()
        return termina
    }

    return {
        cambiar(v: T) {
            pendiente = { v }
            quitarReloj()
            reloj = setTimeout(() => {
                reloj = null
                void arrancar()
            }, pausaMs)
        },
        /** Saves what is pending now; resolves once everything asked so far is saved. */
        vaciar(): Promise<void> {
            quitarReloj()
            return arrancar()
        },
    }
}
