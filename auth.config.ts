/**
 * Configurazione NextAuth compatibile con Edge Runtime.
 * NON importare bcrypt, prisma, o qualsiasi modulo Node.js qui.
 * Usato dal middleware per verificare la sessione JWT.
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [], // I provider (Credentials + bcrypt) stanno in lib/auth.ts
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.ruolo = (user as { ruolo?: string }).ruolo;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { ruolo?: string }).ruolo = token.ruolo as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
