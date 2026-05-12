"use server";

import { signOut } from "@/auth";

export async function clearSessionAction() {
  await signOut({ redirectTo: "/login" });
}
