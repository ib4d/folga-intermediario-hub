import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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
      const isPublicRoute =
        pathname === "/" ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/registro") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/health") ||
        pathname.startsWith("/api/v1") ||
        pathname.startsWith("/api/v2/events") ||
        pathname.startsWith("/api/cron") ||
        pathname === "/manifest.json" ||
        pathname === "/sw.js" ||
        /\.[^/]+$/.test(pathname);

      if (!isLoggedIn && !isPublicRoute) {
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as import("@prisma/client").Role;
        session.user.organizationId = token.organizationId as string;
        session.user.isPlatformAdmin = !!token.isPlatformAdmin;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
