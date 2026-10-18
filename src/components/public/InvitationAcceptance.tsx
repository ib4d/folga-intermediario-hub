"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOrganizationInvitationInfo } from "@/app/actions/invitations";
import AcceptOrganizationInvitationForm from "@/components/public/AcceptOrganizationInvitationForm";
import AuthShell from "@/components/public/AuthShell";
import { t, type AppLanguage } from "@/lib/i18n";

const PENDING_INVITATION_TOKEN_KEY = "ori.pending-invitation-token";

type InvitationInfo = {
  status: "valid";
  organizationName: string;
  invitedName: string;
  email: string;
  role: string;
  requiresNewAccount: boolean;
  viewer: "signed-out" | "matching" | "other";
};

type LookupState = "checking" | "invalid" | "error" | "valid";

export default function InvitationAcceptance({
  language,
  initialStatus,
}: {
  language: AppLanguage;
  initialStatus: string;
}) {
  const labels = t.bind(null, language);
  const router = useRouter();
  const [token, setToken] = useState("");
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [lookupState, setLookupState] = useState<LookupState>("checking");
  const [handoffFailed, setHandoffFailed] = useState(false);
  const invitationTokenRef = useRef("");

  useEffect(() => {
    let active = true;
    let invitationToken = "";
    const scheduleLookupState = (nextState: LookupState) => {
      void Promise.resolve().then(() => {
        if (active) setLookupState(nextState);
      });
    };
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const fragmentToken = fragment.get("token") ?? "";

    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }

    try {
      if (fragmentToken) {
        window.sessionStorage.removeItem(PENDING_INVITATION_TOKEN_KEY);
        invitationToken = fragmentToken;
        invitationTokenRef.current = fragmentToken;
      } else if (invitationTokenRef.current) {
        invitationToken = invitationTokenRef.current;
      } else {
        invitationToken = window.sessionStorage.getItem(PENDING_INVITATION_TOKEN_KEY) ?? "";
        window.sessionStorage.removeItem(PENDING_INVITATION_TOKEN_KEY);
        invitationTokenRef.current = invitationToken;
      }
    } catch {
      scheduleLookupState("error");
      return () => {
        active = false;
      };
    }

    if (initialStatus === "invalid" || !/^[A-Za-z0-9_-]{43}$/.test(invitationToken)) {
      scheduleLookupState("invalid");
      return () => {
        active = false;
      };
    }

    startTransition(() => {
      void getOrganizationInvitationInfo(invitationToken, language)
        .then((result) => {
          if (!active) return;
          if (result.status === "valid") {
            setToken(invitationToken);
            setInfo(result);
            setLookupState("valid");
          } else {
            setLookupState(result.status);
          }
        })
        .catch(() => {
          if (active) setLookupState("error");
        });
    });

    return () => {
      active = false;
    };
  }, [initialStatus, language]);

  const callbackUrl = `/invitations/accept?${new URLSearchParams({ lang: language })}`;
  const loginHref = `/login?${new URLSearchParams({ callbackUrl, lang: language })}`;
  const beginLogin = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    try {
      window.sessionStorage.setItem(PENDING_INVITATION_TOKEN_KEY, token);
      router.push(loginHref);
    } catch {
      setHandoffFailed(true);
    }
  };

  const validInfo = lookupState === "valid" ? info : null;
  const description = validInfo
    ? `${validInfo.invitedName} · ${validInfo.role} · ${validInfo.email}`
    : lookupState === "checking"
      ? labels("invite.checking")
      : lookupState === "error"
        ? labels("invite.acceptFailed")
        : labels("invite.invalid");

  return (
    <AuthShell
      badge={labels("invite.acceptTitle")}
      title={validInfo ? validInfo.organizationName : labels("invite.acceptTitle")}
      description={description}
    >
      {lookupState === "checking" ? (
        <p role="status">{labels("invite.checking")}</p>
      ) : !validInfo ? (
        <p role="alert">
          {lookupState === "error" ? labels("invite.acceptFailed") : labels("invite.invalid")}
        </p>
      ) : validInfo.viewer === "other" ? (
        <p role="alert">{labels("invite.wrongAccount")}</p>
      ) : validInfo.viewer === "signed-out" && !validInfo.requiresNewAccount ? (
        <div className="compact-stack">
          <p>{labels("invite.signInRequired")}</p>
          {handoffFailed ? <p role="alert">{labels("invite.loginHandoffError")}</p> : null}
          <Link className="button" href={loginHref} onClick={beginLogin}>
            {labels("public.nav.login")}
          </Link>
        </div>
      ) : (
        <div className="compact-stack">
          <p>{labels("invite.acceptDescription")}</p>
          <AcceptOrganizationInvitationForm
            token={token}
            language={language}
            requiresNewAccount={validInfo.requiresNewAccount}
            invitedName={validInfo.invitedName}
          />
        </div>
      )}
    </AuthShell>
  );
}
