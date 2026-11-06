import { create } from 'zustand'
import { router } from 'expo-router'

/**
 * The mesa Crear shows. It travels here, not as a route param: Crear is a tab, and when a sheet or modal
 * over it closes with params (POP_TO), React Navigation drops the nested params, so «pick a mesa» did nothing.
 */
export const useMesaAbierta = create<{ id: string | null }>(() => ({ id: null }))

/** Crear on this mesa (or 'nueva'), from anywhere: closes what's on top, then shows the Crear tab. */
export function abrirEnCrear(id: string) {
  useMesaAbierta.setState({ id })
  if (router.canDismiss()) router.dismissAll()
  router.navigate('/')
}
