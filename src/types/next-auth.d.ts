import "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role | string;
      organizationId?: string | null;
      isPlatformAdmin: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: Role | string;
    organizationId?: string | null;
    isPlatformAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    organizationId?: string | null;
    isPlatformAdmin: boolean;
  }
}
