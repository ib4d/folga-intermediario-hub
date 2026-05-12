import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AuthShell from "@/components/public/AuthShell";
import OnboardingForm from "@/components/public/OnboardingForm";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const persistedUser = await prisma.user.findFirst({
    where: {
      OR: [
        ...(session.user.id ? [{ id: session.user.id }] : []),
        ...(session.user.email ? [{ email: session.user.email }] : []),
      ],
    },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (persistedUser?.organizationId) {
    redirect("/dashboard");
  }

  if (!persistedUser) {
    redirect("/login");
  }

  return (
    <AuthShell
      badge="Primer acceso"
      title="Activa tu espacio operativo"
      description="Configura la organizacion inicial y deja listo el entorno para candidatos, documentos, legal y logistica."
    >
      <OnboardingForm />
    </AuthShell>
  );
}
