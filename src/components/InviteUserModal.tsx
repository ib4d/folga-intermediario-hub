"use client";

import { useActionState, useEffect, useState, type CSSProperties } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import { inviteUserAction } from "@/app/actions/invitations";

const initialInviteState = {
  error: "",
  success: "",
  emailSent: false,
  tempPassword: "",
};

export default function InviteUserModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(inviteUserAction, initialInviteState);
  const deliveryNoticeStyle: CSSProperties = state.emailSent
    ? {
        padding: "0.85rem 1rem",
        backgroundColor: "#ecfdf5",
        color: "#166534",
        border: "1px solid #bbf7d0",
        borderRadius: 0,
        fontSize: "0.875rem",
        fontWeight: 700,
      }
    : {
        padding: "0.85rem 1rem",
        backgroundColor: "#fffbeb",
        color: "#92400e",
        border: "1px solid #f59e0b",
        borderRadius: 0,
        fontSize: "0.875rem",
        fontWeight: 700,
      };

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <button className="button" type="button" onClick={() => setIsOpen(true)}>
        <UserPlus size={16} style={{ marginRight: "0.5rem" }} /> Invitar Usuario
      </button>

      {isOpen ? (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-panel card"
            style={{ maxWidth: "480px" }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
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

            <form action={formAction} className="compact-stack">
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
                  {state.success}
                  {state.tempPassword ? (
                    <div style={{ marginTop: "0.75rem", color: "var(--pitch-black)" }}>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                          color: "var(--muted-foreground)",
                          marginBottom: "0.35rem",
                        }}
                      >
                        Contrasena temporal
                      </div>
                      <code
                        style={{
                          display: "inline-block",
                          padding: "0.5rem 0.75rem",
                          backgroundColor: "white",
                          border: "1px solid #f59e0b",
                          borderRadius: 0,
                          fontSize: "0.9rem",
                        }}
                      >
                        {state.tempPassword}
                      </code>
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
                  defaultValue="INTERMEDIARIO"
                  disabled={isPending}
                >
                  <option value="INTERMEDIARIO">Intermediario</option>
                  <option value="LEGAL">Legal</option>
                  <option value="LOGISTICA">Logistica</option>
                  <option value="ADMIN">Administrador</option>
                </select>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                    marginTop: "0.25rem",
                    marginBottom: 0,
                  }}
                >
                  Solo los superadmins pueden crear otros administradores.
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
      ) : null}
    </>
  );
}
