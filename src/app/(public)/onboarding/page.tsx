import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AuthShell from "@/components/public/AuthShell";
import OnboardingForm from "@/components/public/OnboardingForm";
import { normalizeLanguage, t } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; lang?: string }>;
}) {
  const { mode: workspaceModeParam, lang } = await searchParams;
  const workspaceMode = workspaceModeParam === "demo" ? "demo" : "standard";
  const requestedLanguage = normalizeLanguage(lang);
  const onboardingQuery = new URLSearchParams();
  if (workspaceMode === "demo") onboardingQuery.set("mode", "demo");
  onboardingQuery.set("lang", requestedLanguage);
  const onboardingCallbackUrl = `/onboarding?${onboardingQuery.toString()}`;
  const loginHref = `/login?${new URLSearchParams({ callbackUrl: onboardingCallbackUrl, lang: requestedLanguage }).toString()}`;

  const session = await auth();
  const language = normalizeLanguage(lang ?? session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);

  if (!session) {
    return (
      <AuthShell
        badge={workspaceMode === "demo" ? labels("onboarding.demoBadge") : labels("onboarding.badge")}
        title={workspaceMode === "demo" ? labels("onboarding.demoTitle") : labels("onboarding.title")}
        description={
          workspaceMode === "demo" ? labels("onboarding.demoDescription") : labels("onboarding.description")
        }
        footer={
          <span>{workspaceMode === "demo" ? labels("onboarding.demoFooter") : labels("onboarding.footer")}</span>
        }
      >
        <OnboardingForm
          mode={workspaceMode}
          title={workspaceMode === "demo" ? labels("onboarding.demoFormTitle") : labels("onboarding.formTitle")}
          description={
            workspaceMode === "demo" ? labels("onboarding.demoFormDescription") : labels("onboarding.formDescription")
          }
          stepsLabel={workspaceMode === "demo" ? labels("onboarding.demoStepsLabel") : labels("onboarding.stepsLabel")}
          steps={
            workspaceMode === "demo"
              ? [labels("onboarding.demoStep1"), labels("onboarding.demoStep2"), labels("onboarding.demoStep3")]
              : [labels("onboarding.step1"), labels("onboarding.step2"), labels("onboarding.step3")]
          }
          nameLabel={labels("onboarding.nameLabel")}
          namePlaceholder={labels("onboarding.namePlaceholder")}
          submitLabel={workspaceMode === "demo" ? labels("onboarding.demoSubmit") : labels("onboarding.submit")}
          submittingLabel={workspaceMode === "demo" ? labels("onboarding.demoSubmitting") : labels("onboarding.submitting")}
          footerText={workspaceMode === "demo" ? labels("onboarding.demoTerms") : labels("onboarding.terms")}
          requiresAccount={true}
          accountTitle={labels("onboarding.accountTitle")}
          fullNameLabel={labels("onboarding.fullNameLabel")}
          fullNamePlaceholder={labels("onboarding.fullNamePlaceholder")}
          emailLabel={labels("onboarding.emailLabel")}
          emailPlaceholder={labels("onboarding.emailPlaceholder")}
          passwordLabel={labels("onboarding.passwordLabel")}
          passwordPlaceholder={labels("onboarding.passwordPlaceholder")}
          existingAccountLabel={labels("onboarding.existingAccountLabel")}
          existingAccountAction={labels("onboarding.existingAccountAction")}
          existingAccountHref={loginHref}
        />
      </AuthShell>
    );
  }

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

  if (persistedUser?.organizationId && workspaceMode !== "demo") {
    redirect("/dashboard");
  }

  if (!persistedUser) {
    redirect(loginHref);
  }

  return (
    <AuthShell
      badge={workspaceMode === "demo" ? labels("onboarding.demoBadge") : labels("onboarding.badge")}
      title={workspaceMode === "demo" ? labels("onboarding.demoTitle") : labels("onboarding.title")}
      description={
        workspaceMode === "demo" ? labels("onboarding.demoDescription") : labels("onboarding.description")
      }
      footer={
        <span>{workspaceMode === "demo" ? labels("onboarding.demoFooter") : labels("onboarding.footer")}</span>
      }
    >
      <OnboardingForm
        mode={workspaceMode}
        title={workspaceMode === "demo" ? labels("onboarding.demoFormTitle") : labels("onboarding.formTitle")}
        description={
          workspaceMode === "demo" ? labels("onboarding.demoFormDescription") : labels("onboarding.formDescription")
        }
        stepsLabel={workspaceMode === "demo" ? labels("onboarding.demoStepsLabel") : labels("onboarding.stepsLabel")}
        steps={
          workspaceMode === "demo"
            ? [labels("onboarding.demoStep1"), labels("onboarding.demoStep2"), labels("onboarding.demoStep3")]
            : [labels("onboarding.step1"), labels("onboarding.step2"), labels("onboarding.step3")]
        }
        nameLabel={labels("onboarding.nameLabel")}
        namePlaceholder={labels("onboarding.namePlaceholder")}
        submitLabel={workspaceMode === "demo" ? labels("onboarding.demoSubmit") : labels("onboarding.submit")}
        submittingLabel={workspaceMode === "demo" ? labels("onboarding.demoSubmitting") : labels("onboarding.submitting")}
        footerText={workspaceMode === "demo" ? labels("onboarding.demoTerms") : labels("onboarding.terms")}
        requiresAccount={false}
        accountTitle={labels("onboarding.accountTitle")}
        fullNameLabel={labels("onboarding.fullNameLabel")}
        fullNamePlaceholder={labels("onboarding.fullNamePlaceholder")}
        emailLabel={labels("onboarding.emailLabel")}
        emailPlaceholder={labels("onboarding.emailPlaceholder")}
        passwordLabel={labels("onboarding.passwordLabel")}
        passwordPlaceholder={labels("onboarding.passwordPlaceholder")}
        existingAccountLabel={labels("onboarding.existingAccountLabel")}
        existingAccountAction={labels("onboarding.existingAccountAction")}
        existingAccountHref={loginHref}
      />
    </AuthShell>
  );
}
