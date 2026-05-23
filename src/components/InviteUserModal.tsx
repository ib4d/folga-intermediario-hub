"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { CheckCircle2, Copy, Loader2, MailWarning, UserPlus, X } from "lucide-react";
import { inviteUserAction } from "@/app/actions/invitations";

type InviteRole = "ADMIN" | "INTERMEDIARIO" | "LEGAL" | "LOGISTICA";

const initialInviteState = {
  error: "",
  success: "",
  emailSent: false,
  tempPassword: "",
  deliveryDetail: "",
};

type InviteUserModalProps = {
  allowedRoles?: InviteRole[];
};

const ROLE_LABELS: Record<InviteRole, string> = {
  ADMIN: "Administrador",
  INTERMEDIARIO: "Intermediario",
  LEGAL: "Legal",
  LOGISTICA: "Logistica",
};

function InviteUserModalPanel({
  allowedRoles,
  onClose,
}: {
  allowedRoles: InviteRole[];
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(inviteUserAction, initialInviteState);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const defaultRole = allowedRoles[0] ?? "INTERMEDIARIO";

  const deliveryNoticeStyle: CSSProperties = state.emailSent
    ? {
        padding: "0.95rem 1rem",
        backgroundColor: "#ecfdf5",
        color: "#166534",
        border: "1px solid #bbf7d0",
        borderRadius: 0,
        fontSize: "0.875rem",
        fontWeight: 700,
      }
    : {
        padding: "0.95rem 1rem",
        backgroundColor: "#fffbeb",
        color: "#92400e",
        border: "1px solid #f59e0b",
        borderRadius: 0,
        fontSize: "0.875rem",
        fontWeight: 700,
      };

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
  }, [state.success]);

  const handleCopy = async () => {
    if (!state.tempPassword) return;
    try {
      await navigator.clipboard.writeText(state.tempPassword);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel card"
        style={{ maxWidth: "480px" }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="icon-button"
          style={{ position: "absolute", right: "1rem", top: "1rem" }}
        >
          <X size={24} />
        </button>

        <h2
          style={{
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            paddingRight: "3rem",
          }}
        >
          <UserPlus size={24} /> Invitar Nuevo Usuario
        </h2>

        <form ref={formRef} action={formAction} className="compact-stack">
          {state.error ? (
            <div
              style={{
                padding: "0.85rem 1rem",
                backgroundColor: "#fef2f2",
                color: "#b91c1c",
                border: "1px solid #fecaca",
                borderRadius: 0,
                fontSize: "0.875rem",
                fontWeight: 700,
              }}
            >
              {state.error}
            </div>
          ) : null}

          {state.success ? (
            <div style={deliveryNoticeStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.65rem",
                }}
              >
                {state.emailSent ? <CheckCircle2 size={18} /> : <MailWarning size={18} />}
                <div style={{ flex: 1 }}>
                  <div>{state.success}</div>
                  {state.deliveryDetail ? (
                    <div
                      style={{
                        marginTop: "0.5rem",
                        fontWeight: 500,
                        fontSize: "0.8rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {state.deliveryDetail}
                    </div>
                  ) : null}
                </div>
              </div>

              {state.tempPassword ? (
                <div
                  style={{
                    marginTop: "0.85rem",
                    paddingTop: "0.85rem",
                    borderTop: "1px solid rgba(146, 64, 14, 0.2)",
                    color: "var(--pitch-black)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      color: "var(--muted-foreground)",
                      marginBottom: "0.35rem",
                    }}
                  >
                    Entrega manual requerida
                  </div>
                  <div style={{ fontSize: "0.8rem", marginBottom: "0.55rem", fontWeight: 500 }}>
                    Comparte esta contrasena temporal con el usuario por un canal seguro.
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "stretch",
                      flexWrap: "wrap",
                    }}
                  >
                    <code
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        minHeight: "44px",
                        padding: "0.5rem 0.75rem",
                        backgroundColor: "white",
                        border: "1px solid #f59e0b",
                        borderRadius: 0,
                        fontSize: "0.9rem",
                        fontWeight: 700,
                      }}
                    >
                      {state.tempPassword}
                    </code>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={handleCopy}
                      style={{ minWidth: "140px", paddingInline: "0.9rem" }}
                    >
                      <Copy size={16} style={{ marginRight: "0.45rem" }} />
                      {copied ? "Copiada" : "Copiar clave"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div>
            <label className="label" htmlFor="invite-name">
              Nombre
            </label>
            <input
              id="invite-name"
              name="name"
              type="text"
              className="input"
              required
              placeholder="Nombre completo"
              disabled={isPending}
            />
          </div>

          <div>
            <label className="label" htmlFor="invite-email">
              Correo Electronico
            </label>
            <input
              id="invite-email"
              name="email"
              type="email"
              className="input"
              required
              placeholder="correo@ejemplo.com"
              disabled={isPending}
            />
          </div>

          <div>
            <label className="label" htmlFor="invite-role">
              Rol
            </label>
            <select
              id="invite-role"
              name="role"
              className="select"
              required
              defaultValue={defaultRole}
              disabled={isPending}
            >
              {allowedRoles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--muted)",
                marginTop: "0.25rem",
                marginBottom: 0,
              }}
            >
              Solo veras roles que tu nivel puede conceder.
            </p>
          </div>

          <button
            type="submit"
            className="button"
            style={{ width: "100%", marginTop: "1rem" }}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" size={20} style={{ marginRight: "0.5rem" }} />
                Enviando...
              </>
            ) : (
              "Crear usuario e invitar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InviteUserModal({
  allowedRoles = ["INTERMEDIARIO"],
}: InviteUserModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const openModal = () => {
    setSessionKey((current) => current + 1);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button className="button" type="button" onClick={openModal}>
        <UserPlus size={16} style={{ marginRight: "0.5rem" }} /> Invitar Usuario
      </button>

      {isOpen ? (
        <InviteUserModalPanel
          key={sessionKey}
          allowedRoles={allowedRoles}
          onClose={closeModal}
        />
      ) : null}
    </>
  );
}
