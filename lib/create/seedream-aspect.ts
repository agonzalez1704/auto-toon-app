import type { AspectRatio } from './aspect'

/**
 * La forma que el cliente pidió, traducida al vocabulario de `seedreamConfig`.
 *
 * La ruta `enhance-product` tiene DOS listas de aspect ratio y no son
 * intercambiables:
 *
 *   aspectRatio (nivel superior)   1:1 4:5 9:16 16:9 3:4
 *   seedreamConfig.aspect_ratio    1:1 4:3 3:4 16:9 9:16 3:2 2:3 21:9
 *
 * `parseAspectIntent` devuelve de la primera; móvil solo manda la segunda. Sin
 * traducir, decir "para Instagram" produce `4:5`, que la segunda rechaza — y
 * la generación muere con 400 después de que el cliente ya eligió su idea.
 *
 * Este error ya había ocurrido en la web con el mismo par de listas.
 */
export function toSeedreamAspect(ratio: AspectRatio): string {
    // 4:5 no existe en el vocabulario de seedream; 3:4 es el vertical más
    // cercano y el que la app ya usa por defecto para feed.
    return ratio === '4:5' ? '3:4' : ratio
}
