import type { Apartado, Aspecto } from '@/lib/estudio'

/**
 * Crear's «E-commerce» and «Cuadrícula» modes: the names the table gives their pieces and the little logic both
 * screens share. Plain data and pure functions (no React Native), so `modos.check.ts` runs it with tsx.
 */

/** What the table calls a grid while it waits to be chosen from (lib/crear/cuadricula-etiquetas on the web). */
export const CUADRICULA = 'Cuadrícula'
/** A cell made in alta: «Cuadrícula · <its scene> · final». */
export const DE_CUADRICULA = 'Cuadrícula · '
/** A catalogue piece: «Catálogo · <its shot>[ · final]» (app/(estudio)/crear/ecommerce on the web). */
export const CATALOGO = 'Catálogo · '

export type Familia = 'calzado' | 'general'
export type Fondo = 'puro' | 'estudio' | 'gris'
/** The shots a product starts with: the three a shop shows first. */
export const DE_ENTRADA: Record<Familia, string[]> = { calzado: ['heroe', 'perfil', 'recargado'], general: ['heroe', 'frente', 'perfil'] }

/** Crear's way to order: priced first, queued, the pieces named and watched (mesa-screen `mandar`). */
export type Mandar = (fn: () => Promise<Apartado>, asked: { label: string; aspect: Aspecto }[]) => Promise<Apartado | null>

const CALZADO = /calzado|zapat|tenis|sneaker|shoe|bota|botin|sandalia|mocas[ií]n|huarache|tac[oó]n|footwear/i

/** Which list of shots a product gets: its category, else what it is called or described as (lib/crear/catalogo `familiaDe`, kept identical). */
export function familiaDe(categoria: string | null | undefined, ...textos: (string | null | undefined)[]): Familia {
  if (categoria === 'shoes' || categoria === 'footwear') return 'calzado'
  return textos.some((t) => t && CALZADO.test(t)) ? 'calzado' : 'general'
}

/** Rows of `n` for the boards' `repeat(n, 1fr)` grids, laid out with flex; the last row padded with nulls so every cell keeps its width. */
export function filas<T>(xs: T[], n: number): (T | null)[][] {
  const out: (T | null)[][] = []
  for (let i = 0; i < xs.length; i += n) out.push([...xs.slice(i, i + n), ...Array<null>(Math.max(0, i + n - xs.length)).fill(null)])
  return out
}

/** A tile's name: «Seto en la banqueta · alta · 4:5». */
export const nombreLlegada = (label: string, prefijo: string, aspect: string) => `${label.slice(prefijo.length).replace(/ · final$/, ' · alta')} · ${aspect}`

/**
 * The grid on the table: the newest one not chosen from yet. A failed one sends the person back to ordering
 * (and says so); one on its way is «generando»; one that arrived is «elegir».
 */
export function cuadriculaDe<P extends { id: string; label: string; status: string; resultUrl: string | null }>(piezas: P[], usadas: string[]) {
  const grid = [...piezas].reverse().find((p) => p.label === CUADRICULA && !usadas.includes(p.id))
  const fallo = grid?.status === 'failed' ? grid : undefined
  const vigente = fallo ? undefined : grid
  const llego = !!vigente && (vigente.status === 'ready' || vigente.status === 'completed') && !!vigente.resultUrl
  const fase: 'pedido' | 'generando' | 'elegir' = !vigente ? 'pedido' : llego ? 'elegir' : 'generando'
  return { vigente, fallo, fase }
}
