import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { isPublicRoute } from "@/lib/public-routes";

export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize() {
        return null; // Will be overridden in auth.ts
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      if (!isLoggedIn && !isPublicRoute(pathname)) {
        return false; // Redirect to login
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.isPlatformAdmin = user.isPlatformAdmin;
        token.interfaceLanguage = user.interfaceLanguage;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as import("@prisma/client").Role;
        session.user.organizationId = token.organizationId as string;
        session.user.isPlatformAdmin = !!token.isPlatformAdmin;
        session.user.interfaceLanguage = token.interfaceLanguage as import("@/lib/i18n").AppLanguage | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
