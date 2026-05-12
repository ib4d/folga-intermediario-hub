# plan.md

## Main Goal
Refine and optimize the existing recruitment operations platform to production quality, with focus on UX consistency, operational speed, and recruiter-first design.

**Important:** This app is already functional with solid architecture. The goal is to **refine, not rebuild**.

---

## Phase 0 — Deep Audit of Current State
### Objective
Understand exactly what exists, what works, and what needs improvement.

### Tasks
1. Map all existing routes and their purpose
2. Identify which pages are fully implemented vs. placeholder
3. Audit Prisma schema for unused fields or missing indexes
4. Detect duplicated UI patterns across components
5. Identify inconsistent status handling across modules
6. Review server actions vs. API routes usage
7. Check for unused or orphaned components
8. Identify missing error/loading/empty states
9. Review mobile responsiveness across key screens
10. Document technical debt and fragile patterns

### Deliverables
- Audit report in markdown format
- Priority matrix: High/Medium/Low impact improvements
- Recommendation: refactor in place vs. targeted module redesign

### Validation
- No code changes yet
- Findings documented clearly
- Next phase prioritized based on impact

---

## Phase 1 — Design System Foundation
### Objective
Establish visual consistency before redesigning business screens.

### Current State
- Tailwind CSS 4 in use
- Some custom components exist
- No clear design system documented

### Tasks
1. Define color palette for statuses (pending, approved, rejected, urgent, expiring, complete)
2. Standardize typography scale
3. Create reusable badge component system (status, priority, country)
4. Standardize card, table, form, button, and input patterns
5. Create consistent page header pattern
6. Define spacing/layout grid
7. Standardize empty, loading, and error state patterns
8. Create timeline component for candidate history
9. Document design tokens (colors, spacing, radius, shadows)

### Deliverables
- `design-system.md` documentation
- Reusable UI primitives in `/components/ui/` or equivalent
- Updated 3+ screens using new system

### Validation
- Lint passes
- Build succeeds
- Visual consistency visible across pages
- No duplicate styling code

---

## Phase 2 — Dashboard Redesign
### Objective
Make the main dashboard operationally useful for daily recruiter work.

### Current State
- `/dashboard` exists with basic stats
- Uses DashboardCharts component
- Has ExportButton

### Tasks
1. Add KPI strip at top (total active, pending legal, upcoming arrivals, payment pending)
2. Create urgent/blocker alerts section (expiring docs, missing data, overdue reviews)
3. Add pending legal queue preview (with link to full legal page)
4. Add upcoming Kutno arrivals widget (next 7 days)
5. Add recent activity feed (latest candidate updates)
6. Add quick actions (add candidate, search, export)
7. Improve visual hierarchy and scanability
8. Add filters/date range for activity view
9. Optimize for recruiter speed (max 10 seconds to identify priorities)

### Deliverables
- Redesigned `/dashboard` page
- Updated DashboardCharts if needed
- Mobile-responsive layout

### Validation
- Dashboard loads in <2s
- All widgets show realistic data
- Empty states handled
- No layout shift on load

---

## Phase 3 — Candidate Pipeline UX
### Objective
Optimize the main candidate list/table for fast scanning and updates.

### Current State
- `/candidatos` exists at ~5750 characters (already substantial)
- Likely has table/list view

### Tasks
1. Audit current table structure and identify improvements
2. Add advanced filters (status, legal decision, payment, country, intermediary, date range)
3. Add search by name, email, phone, passport number
4. Add sortable columns
5. Add inline status badge for quick scanning
6. Add quick actions (view, edit, send to legal, mark paid, archive)
7. Add bulk selection if useful (bulk export, bulk status update)
8. Optimize for dense data display without clutter
9. Add pagination or infinite scroll based on data volume
10. Add saved filter views (e.g., "Pending Legal", "Unpaid", "Arriving This Week")

### Deliverables
- Optimized `/candidatos` page
- Reusable table component if applicable
- Fast filter/search UX

### Validation
- Table handles 100+ candidates smoothly
- Filters work instantly
- No horizontal scroll on desktop
- Mobile view is usable (stacked cards if needed)

---

## Phase 4 — Candidate Profile Redesign
### Objective
Create the best-in-class candidate detail view for operational clarity.

### Current State
- `/candidatos/[id]` exists
- Likely shows candidate data

### Tasks
1. Redesign layout with clear section grouping:
   - Personal info block
   - Contact block
   - Documents checklist (with validity/expiry warnings)
   - Legal status block (decision, reason if rejected, reviewer, date)
   - Payment block (400 PLN status, proof, date)
   - Logistics block (arrival date, transport, accommodation, notes)
   - Notes/communications log
   - Full timeline of status changes
2. Add visual document completeness indicator
3. Add expiry warnings for documents <60 days from expiration
4. Add quick actions in header (edit, send to legal, mark paid, schedule arrival)
5. Add audit timeline showing who changed what and when
6. Make all critical info visible without scrolling excessively

### Deliverables
- Redesigned `/candidatos/[id]` page
- Reusable profile section components
- Timeline component

### Validation
- All candidate data visible and scannable
- Blockers immediately obvious
- Actions are fast and clear
- Mobile layout is readable

---

## Phase 5 — Document Management UX
### Objective
Handle document-heavy workflows with clarity and speed.

### Current State
- `/documentos` page exists
- Document model in Prisma with relations to Candidate
- OCR agent exists in `src/lib/ai/ocr-agent.ts`

### Tasks
1. Group documents by candidate and type
2. Show document completeness checklist per candidate
3. Surface expiry warnings clearly (color-coded badges)
4. Add upload interface with drag-drop
5. Add document preview/download
6. Add OCR processing status indicator
7. Add manual data extraction override if OCR fails
8. Add bulk upload for multiple candidates
9. Add document validation rules (e.g., passport must not be expired)
10. Add missing document alerts

### Deliverables
- Redesigned `/documentos` page
- Document upload component
- Document validation logic

### Validation
- Upload works smoothly
- Expiry warnings are visible
- Missing docs are trackable
- OCR processing doesn't block UX

---

## Phase 6 — Legal Review Workflow
### Objective
Make legal workflow operational, trackable, and fast.

### Current State
- `/legal` page exists
- LegalReviewQueue, LegalCandidateCard, LegalDecisionModal components exist

### Tasks
1. Audit current legal workflow implementation
2. Create clear queue of candidates awaiting legal review
3. Add decision tracking (approved, rejected, needs more info)
4. Structure rejection reasons (missing docs, docs expiring, irregular status, negative history)
5. Add legal reviewer assignment if applicable
6. Add time-in-legal-review metric
7. Add bulk decision capability if useful
8. Preserve legal decision history in StatusHistory
9. Add legal notes field for internal comments
10. Notify recruiter when decision is made

### Deliverables
- Optimized `/legal` page
- Structured rejection reason system
- Legal decision audit trail

### Validation
- Legal queue is clear and prioritized
- Decisions are tracked completely
- Rejection reasons are reusable in reporting

---

## Phase 7 — Payment & Logistics
### Objective
Support post-approval operational steps clearly.

### Current State
- `/logistica` page exists
- LogisticsEvent model exists
- LogisticsDashboard, LogisticsEventForm, WeeklyArrivals components exist

### Tasks
1. Audit current logistics implementation
2. Add payment tracking dashboard (who paid, who pending, proof upload)
3. Add arrival date confirmation workflow (tentative vs. confirmed)
4. Add Kutno logistics planning (date, time, transport mode, pickup needed, accommodation)
5. Add pre-arrival checklist (payment confirmed, docs valid, transport arranged, accommodation ready)
6. Add weekly arrivals calendar view
7. Add transport coordination notes
8. Add accommodation assignment tracking
9. Integrate with candidate profile for full visibility

### Deliverables
- Optimized `/logistica` page
- Payment tracking interface
- Pre-arrival checklist component

### Validation
- Upcoming arrivals are visible and organized
- Payment status is tracked clearly
- Logistics blockers are visible

---

## Phase 8 — Intermediary Management
### Objective
Reduce chaos from external sourcing partners.

### Current State
- User model with roles (likely includes intermediary role)
- Candidate has intermediaryId relation

### Tasks
1. Create intermediary overview page or section
2. Show active candidates per intermediary
3. Show completed hires per intermediary
4. Show rejection rate or quality metrics
5. Add intermediary performance dashboard
6. Add self-registration link generation for intermediaries
7. Add communication notes logging (WhatsApp/email origin)
8. Make it easy to filter candidates by intermediary

### Deliverables
- Intermediary management interface
- Performance metrics
- Communication logging

### Validation
- Recruiter can see who is responsible for which candidates
- Performance trends are visible

---

## Phase 9 — Reporting Layer
### Objective
Generate operational visibility for stakeholders.

### Current State
- ExportButton component exists
- Export actions likely exist in `/app/actions/exports.ts`

### Tasks
1. Create reporting center page or section
2. Add pre-built reports:
   - Candidates by status
   - Candidates by country
   - Legal approval/rejection rates
   - Time-in-stage metrics
   - Intermediary performance
   - Upcoming arrivals
   - Payment pending
   - Document expiry warnings
3. Add date range filters
4. Add export to Excel/CSV
5. Add visual charts where useful (trends, distributions)
6. Add scheduled report generation if useful (weekly email)

### Deliverables
- Reporting interface
- Export functionality
- Visual charts

### Validation
- Reports generate accurately
- Exports work smoothly
- Stakeholders can get data without manual spreadsheet work

---

## Phase 10 — Hardening & Cleanup
### Objective
Prepare for production and ongoing development.

### Tasks
1. Remove dead code and unused components
2. Remove duplicated logic
3. Improve naming consistency
4. Tighten TypeScript types
5. Add missing error boundaries
6. Add missing loading states
7. Add missing empty states
8. Review and fix mobile responsiveness issues
9. Optimize bundle size if needed
10. Add performance monitoring if useful
11. Update documentation
12. Add inline code comments where helpful
13. Review security (auth, RBAC, data scoping)
14. Review GDPR compliance (data retention, consent, deletion)

### Deliverables
- Cleaner codebase
- Updated documentation
- Production-ready stability

### Validation
- Lint passes
- Build passes with no warnings
- All flows are consistent
- Codebase is easier to extend

---

## Execution Rules
For every phase:
1. Restate the phase objective
2. Audit current implementation first
3. Explain what will change and why
4. Implement in small safe increments
5. Run lint after changes
6. Run build when meaningful
7. Fix issues before moving on
8. Summarize what changed
9. Propose next best step

## Preferred Order
Unless audit proves otherwise:
1. Audit (Phase 0)
2. Design system (Phase 1)
3. Dashboard (Phase 2)
4. Candidate pipeline (Phase 3)
5. Candidate profile (Phase 4)
6. Documents (Phase 5)
7. Legal (Phase 6)
8. Payment/Logistics (Phase 7)
9. Intermediaries (Phase 8)
10. Reporting (Phase 9)
11. Hardening (Phase 10)

## Quality Standard
At completion, the app should feel like a **serious operational tool used daily by professionals**, not a generic template or unfinished prototype.

---

**Created for:** Codex-led product refinement  
**Project:** folga-intermediario-hub  
**Date:** 2026-05-09