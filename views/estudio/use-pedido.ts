import { useQuery } from '@tanstack/react-query'
import { terminada, verPedido, type Pieza } from '@/lib/estudio'

/**
 * A request's pieces, watched until every one has arrived or failed. Looking is also what moves them along on the
 * server (plan D13: the queue's `recover` runs on each look), so it keeps looking while anything is on its way.
 */
export function usePedido(holdId: string | null) {
  return useQuery<Pieza[]>({
    queryKey: ['pedido', holdId],
    queryFn: () => verPedido(holdId!),
    enabled: !!holdId,
    refetchInterval: (q) => (q.state.data && q.state.data.length && q.state.data.every(terminada) ? false : 2500),
  })
}
