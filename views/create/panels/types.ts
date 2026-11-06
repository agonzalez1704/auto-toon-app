/**
 * Lo que recibe un panel de Crear.
 *
 * Un panel corre dentro de la pantalla, no en una ruta propia: por eso no
 * navega, no tiene URL y no asume nada del layout que lo rodea. Recibe el
 * trabajo y una forma de decir que terminó.
 */
export interface PanelProps {
  /** La imagen sobre la que opera, ya en almacenamiento. */
  imageUrl: string
  /** Terminó, con lo que produjo. */
  onDone: (resultUrl: string) => void
  /** Volver sin generar. */
  onCancel: () => void
}
