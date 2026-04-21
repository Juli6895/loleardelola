import type { NextAuthOptions } from "next-auth";
import type { OAuthConfig } from "next-auth/providers/oauth";
import { supabaseAdmin } from "./supabase";

// Perfil devuelto por Pinterest API v5 (/v5/user_account)
type PinterestProfile = {
  username: string;
  account_type?: string;
  profile_image?: string;
  website_url?: string;
  id?: string;
};

// Provider custom de Pinterest siguiendo su OAuth 2.0 v5
// Docs: https://developers.pinterest.com/docs/getting-started/authentication/
function PinterestProvider(): OAuthConfig<PinterestProfile> {
  return {
    id: "pinterest",
    name: "Pinterest",
    type: "oauth",
    authorization: {
      url: "https://www.pinterest.com/oauth/",
      params: {
        scope: "user_accounts:read,boards:read,pins:read",
        response_type: "code",
      },
    },
    token: "https://api.pinterest.com/v5/oauth/token",
    userinfo: "https://api.pinterest.com/v5/user_account",
    clientId: process.env.PINTEREST_CLIENT_ID,
    clientSecret: process.env.PINTEREST_CLIENT_SECRET,
    profile(profile) {
      return {
        id: profile.username,
        name: profile.username,
        email: null as unknown as string,
        image: profile.profile_image ?? null,
      };
    },
  };
}

export const authOptions: NextAuthOptions = {
  providers: [PinterestProvider()],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    // Guardamos el access token de Pinterest en el JWT para poder pegarle a su API
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.pinterestId = (profile as PinterestProfile)?.username ?? token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).pinterestId = token.pinterestId;
      if (session.user) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
    // En cada login hacemos upsert del usuario en Supabase
    async signIn({ user, profile }) {
      try {
        const sb = supabaseAdmin();
        const pinterestId =
          (profile as PinterestProfile)?.username ?? user.id ?? null;
        await sb
          .from("users")
          .upsert(
            {
              email: user.email ?? `${pinterestId}@pinterest.local`,
              name: user.name ?? pinterestId,
              avatar_url: user.image ?? null,
              pinterest_id: pinterestId,
            },
            { onConflict: "pinterest_id" }
          );
      } catch (e) {
        // No bloqueamos el login si falla Supabase — se reintenta al guardar outfits
        console.error("[auth] error guardando usuario:", e);
      }
      return true;
    },
  },
  pages: {
    signIn: "/",
  },
};
