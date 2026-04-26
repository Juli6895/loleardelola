# LolearDeLola 💕

Plataforma de moda para el mercado colombiano: conecta tu Pinterest, sube una
inspiración y te decimos **dónde comprar prendas similares online** usando
Google Shopping.

Stack: **Next.js 14 (App Router) · TypeScript · Tailwind · Supabase ·
NextAuth (Pinterest OAuth) · Claude (Anthropic) + Google Cloud Vision (fallback)
· Cloudinary**. Deploy gratis en **Vercel**.

---

## ✨ Funcionalidades del MVP

1. **Login con Pinterest** via NextAuth + Pinterest API v5.
2. **Importar boards** del usuario autenticado.
3. **Analizar outfits** pegando un link de pin o subiendo una imagen.
   El analizador principal es **Claude Haiku 4.5** (multimodal) — identifica
   prenda + color + estilo en español colombiano. Si falla por cualquier
   motivo (sin API key, error de red, rate limit), cae automáticamente a
   **Google Cloud Vision** como respaldo.
4. **Búsqueda en Google Shopping** con geo Colombia (`gl=co&hl=es-419`).
5. **Guardar outfits** favoritos en Supabase y revisarlos en *Mis Outfits*.
6. UI mobile-first, paleta rosa palo + blanco + negro, fuentes
   Playfair Display + Inter.

---

## 🚀 Comandos rápidos

```bash
npm install
cp .env.example .env.local   # llena las variables
npm run dev                  # http://localhost:3000
```

---

## 🔑 Configuración de cada API

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En *Project Settings → API*, copia:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (⚠️ solo se usa en el servidor)
3. En *SQL Editor*, ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql)
   para crear las tablas `users`, `outfits` y `searches`.

### 2. Pinterest OAuth

1. Ve a [developers.pinterest.com/apps](https://developers.pinterest.com/apps/) y crea una app.
2. Configura los **Redirect URIs**:
   - Desarrollo: `http://localhost:3000/api/auth/callback/pinterest`
   - Producción: `https://TU-DOMINIO.vercel.app/api/auth/callback/pinterest`
3. Copia **App ID** → `PINTEREST_CLIENT_ID`
4. Copia **App secret key** → `PINTEREST_CLIENT_SECRET`
5. Scopes que pedimos: `user_accounts:read`, `boards:read`, `pins:read`.

> Pinterest exige verificación de dominio antes de pasar la app a producción.
> Para probar, agrega tu propia cuenta como *Trusted Tester* en la consola.

### 3. Anthropic (Claude) — analizador principal

1. Crea una API key en [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).
2. Cópiala en `ANTHROPIC_API_KEY`.

Usamos **Claude Haiku 4.5** con visión multimodal y *tool use* para forzar
output estructurado (`searchTerms`, `dominantColors`, `rawLabels`). El system
prompt usa **prompt caching** (TTL 5min) para amortizar el costo del
vocabulario en español colombiano.

> Costo aprox: ~$0.001 por outfit. Mucho mejor identificación de prendas y
> colores que Vision (que mira la imagen como un bag de labels + colores
> globales y termina atribuyendo el café de la pared al pantalón).

### 4. Google Cloud Vision — fallback

1. Entra a [console.cloud.google.com](https://console.cloud.google.com).
2. Crea un proyecto y habilita **Cloud Vision API**.
3. *APIs & Services → Credentials → Create credentials → API key*.
4. Restringe la key a la **Cloud Vision API** por seguridad.
5. Usa el valor en `GOOGLE_CLOUD_VISION_API_KEY`.

> Solo se llama si Claude falla o no hay `ANTHROPIC_API_KEY`. Free tier:
> 1.000 unidades/mes por feature × 3 features = ~330 imágenes/mes gratis.

### 5. Cloudinary

1. Crea cuenta gratis en [cloudinary.com](https://cloudinary.com).
2. En *Dashboard*, copia:
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

### 6. NextAuth

- Genera un secret: `openssl rand -base64 32` → `NEXTAUTH_SECRET`.
- En local: `NEXTAUTH_URL=http://localhost:3000`.
- En Vercel: `NEXTAUTH_URL=https://TU-DOMINIO.vercel.app`.

---

## 🧱 Estructura del proyecto

```
app/
  api/
    auth/[...nextauth]/route.ts   # NextAuth handler
    outfits/route.ts              # CRUD de outfits (Supabase)
    pinterest/boards/route.ts     # Boards del usuario
    vision/route.ts               # Análisis de imagen
  buscar/page.tsx                 # Formulario de análisis
  mis-outfits/page.tsx            # Outfits guardados + boards
  layout.tsx, page.tsx, globals.css
components/
  Hero.tsx, Navbar.tsx, Providers.tsx
  SearchBox.tsx, SearchResult.tsx
  OutfitCard.tsx, TagChip.tsx, BoardsList.tsx
lib/
  auth.ts        # Opciones de NextAuth + provider Pinterest
  supabase.ts    # Clientes anon + service
  cloudinary.ts  # Upload helper
  garment-ai.ts  # Análisis con Claude (multimodal, principal)
  vision.ts      # Análisis con Google Vision (fallback) + scraping Pinterest
  shopping.ts    # URLs de Google Shopping (geo Colombia)
supabase/schema.sql
types/
  index.ts, next-auth.d.ts
```

---

## ☁️ Deploy en Vercel

1. Sube el repo a GitHub.
2. En [vercel.com/new](https://vercel.com/new) importa el repo.
3. En *Environment Variables* agrega **todas** las de `.env.example`.
4. Recuerda actualizar `NEXTAUTH_URL` con tu dominio definitivo y agregar
   el callback de Pinterest a la app en Pinterest Developers.
5. Deploy. Vercel se encarga del build con `next build` + CDN.

### Verifica después del deploy
- [ ] Login con Pinterest funciona (redirige y vuelve a `/mis-outfits`).
- [ ] Boards cargan en `/mis-outfits`.
- [ ] `/buscar` analiza una URL de pin pública.
- [ ] Botón *Guardar outfit* crea registro en Supabase.
- [ ] Los chips abren Google Shopping con resultados de Colombia.

---

## 🇨🇴 Notas sobre el mercado colombiano

- Todas las búsquedas de Google Shopping fijan `gl=co&hl=es-419`.
- Copy en español colombiano, tono cercano ("lolear", "chismosear", etc.).
- UI mobile-first: la mayoría del tráfico entra desde celular.

---

## 🩹 Troubleshooting rápido

| Síntoma | Posible causa |
| --- | --- |
| "Pinterest API: 401" | Token expirado o scopes faltantes — reloguéate. |
| "No pudimos leer la imagen del pin" | Pin privado o URL inválida. |
| Resultados muy genéricos | Claude está cayendo a Vision. Revisa `ANTHROPIC_API_KEY` y los logs `[/api/vision] Claude falló`. |
| Vision devuelve pocas etiquetas | Imagen muy oscura o sin prenda clara — usa otra. |
| Outfits no se guardan | Revisa `SUPABASE_SERVICE_ROLE_KEY` y que el schema.sql se haya ejecutado. |

---

## 📝 Licencia

MIT — úsalo, fórkealo, mejóralo.
