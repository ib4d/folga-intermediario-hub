import OrganizationSignupVerification from "@/components/public/OrganizationSignupVerification";
import { normalizeLanguage } from "@/lib/i18n";

export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default async function VerifyOrganizationSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; status?: string; error?: string }>;
}) {
  const { lang, status = "", error = "" } = await searchParams;

  return (
    <OrganizationSignupVerification
      language={normalizeLanguage(lang)}
      status={status}
      error={error}
    />
  );
}
