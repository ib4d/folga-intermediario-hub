import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkBruteForce, registerFailedAttempt, resetAttempts } from "@/lib/security/brute-force";
import { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const email = credentials.email as string;
        const bf = checkBruteForce(email);
        if (bf.blocked) {
          throw new Error(`Cuenta bloqueada temporalmente. Intente de nuevo en ${Math.ceil(bf.remainingMs / 60000)} minutos.`);
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              where: { isActive: true },
              take: 1,
            },
          },
        });

        if (!user || !user.passwordHash || !user.isActive) {
          registerFailedAttempt(email);
          return null;
        }

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!valid) {
          registerFailedAttempt(email);
          return null;
        }

        resetAttempts(email);

        // Determine current organization and role
        // Priority: Direct organizationId on user, then first active membership
        let currentOrgId = user.organizationId;
        let currentRole = user.role;

        if (!currentOrgId && user.memberships.length > 0) {
          currentOrgId = user.memberships[0].organizationId;
          currentRole = user.memberships[0].role;
        }

        return { 
          id: user.id, 
          email: user.email, 
          name: user.name || "", 
          role: currentRole as Role,
          organizationId: currentOrgId,
          isPlatformAdmin: user.isPlatformAdmin
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as string;
        token.organizationId = user.organizationId;
        token.isPlatformAdmin = user.isPlatformAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.organizationId = token.organizationId as string | null;
        session.user.isPlatformAdmin = !!token.isPlatformAdmin;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
