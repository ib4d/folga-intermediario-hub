import { UserCircle, LogOut } from "lucide-react";
import NotificationsDropdown from "./NotificationsDropdown";
import { auth, signOut } from "@/auth";
import GlobalSearch from "./GlobalSearch";
import { prisma } from "@/lib/prisma";

async function getOrganizationName(organizationId: string | null | undefined) {
  if (!organizationId) return null;

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    return organization?.name ?? null;
  } catch (error) {
    console.error("[Header] Organization lookup failed", error);
    return null;
  }
}

export default async function Header() {
  const session = await auth();
  if (!session) return null;

  const organizationName = await getOrganizationName(session.user.organizationId);

  return (
    <header className="header">
      <div className="header-primary">
        <GlobalSearch />
        {organizationName ? (
          <span className="badge org-badge" title={organizationName}>
            {organizationName}
          </span>
        ) : null}
      </div>

      <div className="header-actions">
        <NotificationsDropdown />

        <div
          className="user-chip"
          style={{
            border: "1px solid var(--border-subtle)",
            backgroundColor: "var(--surface)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div
            className="user-chip-text"
            style={{
              textAlign: "right",
              display: "flex",
              flexDirection: "column",
              gap: "0.1rem",
            }}
          >
            <div
              style={{
                fontSize: "0.8rem",
                fontWeight: 900,
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              {session.user.name}
            </div>
            <div
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                color: "var(--muted-foreground)",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              {session.user.role}
            </div>
          </div>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <UserCircle size={28} strokeWidth={2.2} />
          </div>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button
            type="submit"
            className="icon-button"
            title="Cerrar sesion"
            style={{ backgroundColor: "#fff1f2", color: "#991b1b" }}
          >
            <LogOut size={18} strokeWidth={3} />
          </button>
        </form>
      </div>
    </header>
  );
}
