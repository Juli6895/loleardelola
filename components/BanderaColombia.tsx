/**
 * La banderita de Colombia junto al nombre de una marca colombiana (ver
 * lib/marcas-colombianas.ts). Es un dibujo y no el emoji 🇨🇴: en
 * Windows el emoji de bandera sale como las letras "CO".
 */
export default function BanderaColombia({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 6 4"
      role="img"
      aria-label="Marca colombiana"
      className={`inline-block h-[0.7em] w-[1.05em] shrink-0 rounded-[1px] align-[-0.05em] shadow-[0_0_0_0.5px_rgba(0,0,0,0.15)] ${className}`}
    >
      <title>Marca colombiana</title>
      <rect width="6" height="2" fill="#FCD116" />
      <rect y="2" width="6" height="1" fill="#003893" />
      <rect y="3" width="6" height="1" fill="#CE1126" />
    </svg>
  );
}
