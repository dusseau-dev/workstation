# Context Pack — Workflow-Powered Kanban (Multiboard + Vercel Workflow Builder + Composio)

## 0) Goal
Build a multi-tenant project/task app (kanban) where **workflows integrate with projects**.
- Users manage work on boards (kanban cards).
- Board events (card created/moved/updated) trigger durable workflows.
- Workflows call external tools via **Composio** connectors.
- Visual workflow editor (React Flow) for building workflows.

Core principle: workflows are *project-aware* (scoped to org + project/board) and have monitoring, run history, and per-step logs.

## 1) Primary Repos / Inputs
- Multiboard (kanban base): https://github.com/olliethedev/multiboard
  - Stack: Next.js, shadcn/ui, Better Auth, ZenStack + Prisma, multi-tenant orgs + boards.
- Vercel Workflow Builder template (workflow UI + WDK patterns): https://github.com/vercel-labs/workflow-builder-template
  - Stack: Next.js, React Flow, Vercel Workflow Development Kit (WDK), AI workflow generation.
- Composio (integrations layer): https://composio.dev
  - Use TypeScript SDK + managed OAuth; expose actions as workflow steps.

## 2) Non-goals (MVP)
- No fully generalized RBAC beyond org member/admin + owner of workflow.
- No workflow marketplace.
- No complex BPMN (parallel joins, human approval chains) beyond simple branching.

## 3) High-level Architecture
### Frontend
- Next.js App Router.
- shadcn/ui for UI components.
- Kanban UI from Multiboard.
- Workflow builder UI using React Flow (canvas + nodes + edges + side panels).

### Backend
- Postgres (Supabase or Neon).
- Prisma + ZenStack for ORM + authorization policies.
- Next.js route handlers / server actions.
- Durable workflow execution via Vercel WDK patterns ("use workflow" / "use step").

### Integrations
- Composio SDK.
- Each integration step references a Composio app + action + params.
- Per-user connections for MVP; org-admin management later.

## 4) Data Model (Prisma/ZenStack)
Add these models to `schema.zmodel` (names can be adjusted but keep semantics):

### Workflow
- `Workflow`:
  - `id`
  - `orgId` (FK)
  - `name`, `description`
  - `status`: draft | active | archived
  - `nodesJson` (JSON) — React Flow nodes
  - `edgesJson` (JSON) — React Flow edges
  - `createdById` (FK User)
  - timestamps

### WorkflowTrigger
- `WorkflowTrigger`:
  - `id`
  - `orgId` (FK)
  - `boardId` (nullable FK) — null means org-wide trigger
  - `workflowId` (FK)
  - `triggerType`: manual | card_created | card_moved | card_updated | schedule | webhook
  - `configJson` (JSON) — e.g. column from/to, fields watched, cron
  - `enabled` boolean
  - timestamps

### WorkflowExecution
- `WorkflowExecution`:
  - `id`
  - `orgId` (FK)
  - `workflowId` (FK)
  - `boardId` (nullable FK)
  - `cardId` (nullable FK)
  - `status`: pending | running | completed | failed | canceled
  - `inputJson` (JSON)
  - `outputJson` (JSON)
  - `error` (text nullable)
  - `triggeredByUserId` (nullable FK)
  - `triggerId` (nullable FK)
  - `startedAt`, `completedAt`
  - timestamps

### WorkflowExecutionLog
- `WorkflowExecutionLog`:
  - `id`
  - `executionId` (FK)
  - `nodeId` (string)
  - `nodeName` (string)
  - `status`: running | completed | failed | skipped
  - `inputJson` (JSON)
  - `outputJson` (JSON)
  - `error` (text nullable)
  - `startedAt`, `completedAt`
  - timestamps

### ComposioConnection (optional)
- `ComposioConnection`:
  - `id`
  - `orgId` (FK)
  - `userId` (FK)
  - `appName`
  - `composioEntityId`
  - `status`: connected | disconnected
  - timestamps

### ZenStack Policies
- Org members can read workflows/triggers/executions in their org.
- Only workflow creator and org admins can update/delete workflow.
- Only org admins can manage triggers (or allow workflow creator).

## 5) Key Product Flows
- Create workflow (draft) → edit graph (React Flow) → save JSON.
- Connect integrations (Composio OAuth).
- Board → Automations → add trigger mapping (event → workflow).
- Card event → create execution → run steps durably → log outputs.
- Observe runs (execution detail with node statuses) + card run history.

## 6) Workflow Node Types (MVP)
- Trigger: Manual, Card Created, Card Moved.
- Action: Composio Action (app/action/params), HTTP request (optional).
- AI: Generate/Summarize (optional).
- Logic: Condition (if/else).
- Project actions: Create/Update/Move card.

## 7) API Surface (suggested)
- Workflows: `GET/POST /api/workflows`, `GET/PATCH/DELETE /api/workflows/:id`, `POST /api/workflows/:id/run`.
- Executions: `GET /api/workflows/:id/executions`, `GET /api/executions/:executionId`.
- Triggers: `GET/POST /api/boards/:boardId/triggers`, `PATCH /api/triggers/:id`.
- Composio: `GET /api/integrations/composio/apps`, `GET /api/integrations/composio/apps/:app/actions`, `POST /api/integrations/composio/connect`, `GET /api/integrations/composio/connections`, `POST /api/integrations/composio/execute`.

## 8) Environment Variables
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `COMPOSIO_API_KEY`
- `OPENAI_API_KEY` (if AI steps)

## 9) Build Plan (compressed)
1. Fork Multiboard; confirm org + boards + cards.
2. Add workflow models + ZenStack policies; migrate DB.
3. Add workflow list/create/edit pages; embed React Flow editor.
4. Implement workflow CRUD with ZenStack enhanced Prisma.
5. Add Board → Automations UI; CRUD triggers.
6. Hook board mutations (create/move/update card) to trigger runner.
7. Implement runner + logs + execution dashboard.
8. Integrate Composio; build action node executor.
9. Deploy to Vercel; end-to-end smoke test.

## 10) Acceptance Criteria
- Create workflow visually and save.
- Attach trigger to a board event.
- Moving a card triggers a workflow.
- Workflow calls 1 Composio action.
- Execution logs visible; workflow can update a card.
