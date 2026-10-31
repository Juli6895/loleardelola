import Hero from "@/components/Hero";
import Servicios from "@/components/Servicios";
import AnotarVista from "@/components/AnotarVista";

// El inicio: la primera hoja, con todas las opciones de la app. Las
// promociones ya tienen su propia pestaña (app/promociones), la primera
// de la lista.
export default function HomePage() {
  return (
    <div className="space-y-14">
      {/* El primer paso del embudo, y el tiempo en el inicio. */}
      <AnotarVista nombre="inicio_visto" />
      <Hero />
      <Servicios />
    </div>
  );
}
