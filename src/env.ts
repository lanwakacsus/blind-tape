/** The user asked for reduced motion; read once at load like the original build. */
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
