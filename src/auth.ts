import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkBruteForce, registerFailedAttempt, resetAttempts } from "@/lib/security/brute-force";
import { Prisma, Role } from "@prisma/client";
import { authConfig } from "./auth.config";
import { normalizeLanguage } from "@/lib/i18n";
import { resolveOrganizationAccess } from "@/lib/organization-access";

function getInterfaceLanguage(settings: Prisma.JsonValue | null | undefined) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return undefined;
  }

  return normalizeLanguage((settings as Prisma.JsonObject).interfaceLanguage);
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
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
            memberships: true,
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

        const organizationAccess = resolveOrganizationAccess({
          organizationId: user.organizationId,
          role: user.role,
          memberships: user.memberships,
        });
        if (!organizationAccess && !user.isPlatformAdmin) return null;

        return { 
          id: user.id, 
          email: user.email, 
          name: user.name || "", 
          role: (organizationAccess?.role ?? user.role) as Role,
          organizationId: organizationAccess?.organizationId ?? null,
          isPlatformAdmin: user.isPlatformAdmin,
          interfaceLanguage: getInterfaceLanguage(user.settings),
        };
      },
    }),
  ],
});
