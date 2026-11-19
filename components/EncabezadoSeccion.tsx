// El encabezado de cada sección (Mi perfil, Mi clóset, Mis outfits...):
// el mismo fondo rosado de Buscar y del inicio, el título con una parte en
// cursiva y una sola frase debajo. Lo demás va dentro de cada sección.
export default function EncabezadoSeccion({
  titulo,
  destacado,
  frase,
  children,
}: {
  titulo: string;
  // La parte del título en cursiva rosada.
  destacado?: string;
  frase?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rosa-100 via-white to-rosa-200 px-5 py-9 text-center shadow-suave sm:px-10 sm:py-11">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-rosa-300 opacity-30 blur-3xl" aria-hidden />
      <div className="absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-rosa-400 opacity-20 blur-3xl" aria-hidden />
      <div className="relative">
        <h1 className="font-display text-4xl leading-tight text-noche sm:text-5xl">
          {titulo}
          {destacado && (
            <>
              {" "}
              <span className="italic text-rosa-500">{destacado}</span>
            </>
          )}
        </h1>
        {frase && <p className="mx-auto mt-3 max-w-xl text-noche/65">{frase}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
