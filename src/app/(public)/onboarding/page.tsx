import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AuthShell from "@/components/public/AuthShell";
import OnboardingForm from "@/components/public/OnboardingForm";
import { normalizeLanguage, t } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const language = normalizeLanguage(session.user.interfaceLanguage);
  const labels = t.bind(null, language);

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
      badge={labels("onboarding.badge")}
      title={labels("onboarding.title")}
      description={labels("onboarding.description")}
      footer={<span>{labels("onboarding.footer")}</span>}
    >
      <OnboardingForm
        title={labels("onboarding.formTitle")}
        description={labels("onboarding.formDescription")}
        stepsLabel={labels("onboarding.stepsLabel")}
        steps={[
          labels("onboarding.step1"),
          labels("onboarding.step2"),
          labels("onboarding.step3"),
        ]}
        nameLabel={labels("onboarding.nameLabel")}
        namePlaceholder={labels("onboarding.namePlaceholder")}
        submitLabel={labels("onboarding.submit")}
        submittingLabel={labels("onboarding.submitting")}
        footerText={labels("onboarding.terms")}
      />
    </AuthShell>
  );
}
