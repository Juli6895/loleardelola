import "next-auth";

// Extiende los tipos de NextAuth con los campos que agregamos en callbacks
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    pinterestId?: string;
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    pinterestId?: string;
  }
}
