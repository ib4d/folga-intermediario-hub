import "next-auth";
import { Role } from "@prisma/client";
import { AppLanguage } from "@/lib/i18n";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role | string;
      organizationId?: string | null;
      isPlatformAdmin: boolean;
      interfaceLanguage?: AppLanguage;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: Role | string;
    organizationId?: string | null;
    isPlatformAdmin: boolean;
    interfaceLanguage?: AppLanguage;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    organizationId?: string | null;
    isPlatformAdmin: boolean;
    interfaceLanguage?: AppLanguage;
  }
}
