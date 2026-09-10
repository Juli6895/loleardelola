import type { Silueta } from "@/types";

const PATHS: Record<Silueta, string> = {
  reloj_de_arena:
    "M18 4 C26 4 38 4 46 4 L44 24 C50 34 50 52 44 62 C50 72 50 90 44 100 L20 100 C14 90 14 72 20 62 C14 52 14 34 20 24 Z",
  pera: "M24 4 C30 4 34 4 40 4 L38 26 C48 36 50 60 46 78 C44 90 40 98 36 100 L28 100 C24 98 20 90 18 78 C14 60 16 36 26 26 Z",
  manzana:
    "M20 6 C28 4 36 4 44 6 L48 30 C52 46 52 62 46 76 L40 100 L24 100 L18 76 C12 62 12 46 16 30 Z",
  rectangulo: "M20 4 L44 4 L44 100 L20 100 Z",
  triangulo_invertido:
    "M8 4 L56 4 L48 30 C44 46 40 62 38 78 L36 100 L28 100 L26 78 C24 62 20 46 16 30 Z",
};

// Silueta ilustrada simple, usada tanto en el manual de asesoría como en
// el perfil de la usuaria y (más adelante) como base del Avatar.
export default function SiluetaIcon({
  silueta,
  className,
}: {
  silueta: Silueta;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 64 104" className={className}>
      <path d={PATHS[silueta]} fill="currentColor" opacity="0.85" />
    </svg>
  );
}
