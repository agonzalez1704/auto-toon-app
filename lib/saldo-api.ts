import api from './api'

/** How a movement reads (board Gasto): in, charged, still set aside, or given back whole. */
export type EstadoMovimiento = 'abonado' | 'cobrada' | 'en-curso' | 'regreso'

export interface Movimiento {
  id: string
  /** 'recarga' | 'apartado' | 'devuelto' | 'ajuste' */
  tipo: string
  /** As in the ledger: + money in, − set aside. */
  cents: number
  /** For a request's row: what it gave back. */
  devueltoCents: number
  nota: string | null
  createdAt: string
  nombre: string
  detalle: string
  thumbUrl: string | null
  estado: EstadoMovimiento
}

/** GET /api/saldo in full: the balance, this month, and the newest movements. */
export interface SaldoDetalle {
  saldoCents: number
  apartadoCents: number
  gastoMesCents: number
  cobradoMesCents: number
  /** Pieces charged this month. */
  cobradasMes: number
  /** Pieces that failed this month and went back to the balance. */
  regresaronMes: number
  /** One product photo's price, for «alcanza para ≈ n fotos». */
  fotoCents: number | null
  movimientos: Movimiento[]
}

// Same endpoint as lib/estudio's verSaldo, so it shares the ['saldo'] query and its invalidations.
export const verSaldoDetalle = async () => (await api.get<SaldoDetalle>('/api/saldo')).data
