import Hero from "@/components/Hero";
import Servicios from "@/components/Servicios";
import AnotarVista from "@/components/AnotarVista";
import Promociones from "@/components/Promociones";

export default function HomePage() {
  return (
    <div className="space-y-14">
      {/* El primer paso del embudo, y el tiempo en el inicio. */}
      <AnotarVista nombre="inicio_visto" />
      <Hero />
      {/* Debajo de "Empezar a lolear", con todo el ancho: el gancho de
          la membresía (ver components/Promociones.tsx). */}
      <Promociones />
      <Servicios />
    </div>
  );
}
