import { redirect } from "next/navigation";
import InvitationAcceptance from "@/components/public/InvitationAcceptance";
import { normalizeLanguage } from "@/lib/i18n";

export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default async function AcceptOrganizationInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; lang?: string; status?: string }>;
}) {
  const { token: rawToken = "", lang, status = "" } = await searchParams;
  const language = normalizeLanguage(lang);
  if (rawToken) {
    if (/^[A-Za-z0-9_-]{43}$/.test(rawToken)) {
      const cleanPath = `/invitations/accept?${new URLSearchParams({ lang: language })}`;
      const safeFragment = new URLSearchParams({ token: rawToken });
      redirect(`${cleanPath}#${safeFragment}`);
    }
    redirect(`/invitations/accept?${new URLSearchParams({ lang: language, status: "invalid" })}`);
  }

  return <InvitationAcceptance language={language} initialStatus={status} />;
}
