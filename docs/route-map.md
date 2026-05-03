# Folga Hub Route Map

This document maps all application routes, their access requirements, and their current stabilization status.

## 1. Public Routes (Accessible without login)

| Route | Description | Access | Status |
|-------|-------------|--------|--------|
| `/` | Landing Page / Marketing | Public | 🟡 Pending Review |
| `/login` | Authentication Page | Public | 🟢 Functional |
| `/onboarding` | Organization Setup | Auth (no Org) | 🟢 Functional |
| `/registro/[token]` | Candidate Registration | Public (token) | 🟢 Functional |
| `/registro/[token]/success` | Registration Success | Public (token) | 🟢 Functional |

## 2. Authenticated Dashboard Routes (`(app)`)
All routes below require a valid session and an associated organization.

| Route | Description | Min Role | Status |
|-------|-------------|----------|--------|
| `/dashboard` | Main Metrics & Activity | INTERMEDIARIO | 🟢 Functional |
| `/candidatos` | Candidate List | INTERMEDIARIO | 🟢 Functional |
| `/candidatos/[id]` | Candidate Details | INTERMEDIARIO* | 🟢 Functional |
| `/candidatos/nuevo` | Manual Candidate Entry | INTERMEDIARIO | 🟢 Functional |
| `/legal` | Legal Review Panel | LEGAL | 🟢 Functional |
| `/logistica` | Logistics Management | LOGISTICA | 🟢 Functional |
| `/documentos` | Global Document View | ADMIN | 🟢 Functional |
| `/leads` | Sales Leads | ADMIN | 🟢 Functional |
| `/revenue` | Financial Overview | ADMIN | 🟢 Functional |
| `/marketplace` | Plugin Store | ADMIN | 🟢 Functional |
| `/notificaciones` | User Notifications | INTERMEDIARIO | 🟢 Functional |
| `/ajustes` | Org Settings | ADMIN | 🟢 Functional |
| `/ajustes/branding` | White-label Config | ADMIN | 🟢 Functional |
| `/ajustes/api-keys` | Developer Access | ADMIN | 🟢 Functional |
| `/billing` | Subscription Info | ADMIN | 🟢 Functional |
| `/billing/plans` | Plan Selection | ADMIN | 🟢 Functional |
| `/platform` | Global Platform Admin | SUPERADMIN | 🟢 Functional |

*\*Intermediaries can only see their own candidates. Admins/Legal/Logistics see all within organization.*

## 3. API Routes

| Path | Purpose | Access |
|------|---------|--------|
| `/api/auth/*` | Auth.js handlers | Public |
| `/api/v1/*` | External API v1 | API Key |
| `/api/v2/events` | Event Webhooks | API Key |
| `/api/exports/*` | XLSX/CSV Downloads | Authenticated |
| `/api/health` | System Health | Public |

## 4. Verification Plan
- [ ] Verify `/` loads correctly.
- [ ] Verify `/login` redirects to `/dashboard` if already logged in.
- [ ] Verify `/legal` blocks non-LEGAL/ADMIN roles.
- [ ] Verify `/logistica` blocks non-LOGISTICA/ADMIN roles.
- [ ] Verify `/platform` blocks non-SUPERADMIN roles.
- [ ] Verify tenant isolation (User in Org A cannot see data in Org B).
