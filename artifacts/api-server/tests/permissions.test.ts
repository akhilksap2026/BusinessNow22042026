/**
 * Phase 1-5 RBAC permission matrix — tests.
 *
 * Run with:  pnpm --filter @workspace/api-server test
 *
 * Uses Node 20's built-in test runner (`node:test`) + `node:assert/strict`,
 * with `tsx` as the loader so TypeScript is consumed directly (no compile
 * step).  No third-party test framework is needed.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import { can, canOnProject, canOnProjectFor } from "../src/constants/permissions.ts";
import {
  resolveRole,
  resolveProjectRole,
  ROLES,
} from "../src/constants/roles.ts";
import { validateInviteRole } from "../src/middleware/inviteValidation.ts";

/* ------------------------------------------------------------------ */
/*  1. Account-level matrix                                            */
/* ------------------------------------------------------------------ */

describe("ACCOUNT_ADMIN — full account access", () => {
  const role = ROLES.ACCOUNT_ADMIN;

  it("can manage advanced settings, integrations, and team", () => {
    assert.equal(can(role, "settings.manageAdvanced"), true);
    assert.equal(can(role, "settings.manageIntegrations"), true);
    assert.equal(can(role, "settings.manageTeam"), true);
  });

  it("can perform billing, invoicing, and cost-rate actions", () => {
    assert.equal(can(role, "invoicing.create"), true);
    assert.equal(can(role, "financials.viewCostRates"), true);
    assert.equal(can(role, "financials.manageRateCards"), true);
  });

  it("can view dashboards and create projects", () => {
    assert.equal(can(role, "dashboards.view"), true);
    assert.equal(can(role, "projects.create"), true);
  });
});

describe("SUPER_USER — broad project work, no account ownership", () => {
  const role = ROLES.SUPER_USER;

  it("CANNOT manage integrations or advanced settings", () => {
    assert.equal(
      can(role, "settings.manageAdvanced"),
      false,
      "super_user must not manage advanced settings",
    );
    assert.equal(
      can(role, "settings.manageIntegrations"),
      false,
      "super_user must not manage integrations",
    );
  });

  it("CAN view dashboards, create projects, and submit invoices", () => {
    assert.equal(can(role, "dashboards.view"), true);
    assert.equal(can(role, "projects.create"), true);
    assert.equal(can(role, "invoicing.create"), true);
  });
});

describe("COLLABORATOR — assigned-project contributor only", () => {
  const role = ROLES.COLLABORATOR;

  it("CANNOT create projects or view dashboards", () => {
    assert.equal(
      can(role, "projects.create"),
      false,
      "collaborator must not create projects",
    );
    assert.equal(
      can(role, "dashboards.view"),
      false,
      "collaborator must not view dashboards",
    );
  });

  it("CANNOT manage team or access cost rates", () => {
    assert.equal(can(role, "settings.manageTeam"), false);
    assert.equal(can(role, "financials.viewCostRates"), false);
  });

  it("CAN log time on assigned projects", () => {
    assert.equal(can(role, "timeTracking.submit"), true);
  });
});

describe("CUSTOMER — no account-level permissions", () => {
  const role = ROLES.CUSTOMER;

  it("has every account-level permission denied", () => {
    // Spot-check a representative slice across the matrix.
    const samples = [
      "settings.manageAdvanced",
      "settings.manageIntegrations",
      "settings.manageTeam",
      "projects.create",
      "dashboards.view",
      "invoicing.create",
      "financials.viewCostRates",
      "timeTracking.submit",
    ] as const;
    for (const p of samples) {
      assert.equal(can(role, p), false, `customer must not have '${p}'`);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  2. Project-level matrix                                            */
/* ------------------------------------------------------------------ */

describe("Project-level — CUSTOMER", () => {
  it("CAN rate milestones (CSAT-style feedback)", () => {
    assert.equal(canOnProject("customer", "milestone.rate"), true);
  });

  it("CANNOT delete milestones (or other admin-only destructive actions)", () => {
    assert.equal(canOnProject("customer", "milestone.delete"), false);
    assert.equal(canOnProject("customer", "phase.delete"), false);
    assert.equal(canOnProject("customer", "project.delete"), false);
    // Note: task.delete IS granted to customers in the current matrix
    // (customers can manage their own task list within a project) — that
    // is intentional per the project-permissions design and not asserted here.
  });
});

describe("Project-level — COLLABORATOR", () => {
  it("CAN add tasks on assigned projects", () => {
    assert.equal(canOnProject("collaborator", "task.create"), true);
  });

  it("CANNOT create phases (admin-only structural change)", () => {
    assert.equal(
      canOnProject("collaborator", "phase.create"),
      false,
      "collaborator must not create phases",
    );
  });
});

/* ------------------------------------------------------------------ */
/*  3. Invitation matrix (Phase 4)                                     */
/* ------------------------------------------------------------------ */

/** Tiny harness: drive the express middleware with a fake req/res/next. */
function runInviteValidator(opts: {
  inviterRole: string;
  body: { role: string; projectId?: number; email?: string };
}) {
  let statusCode = 200;
  let payload: unknown = null;
  let nextCalled = false;

  const req = {
    headers: { "x-user-role": opts.inviterRole },
    body: { email: "x@y.z", ...opts.body },
  } as unknown as import("express").Request;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(p: unknown) {
      payload = p;
      return this;
    },
  } as unknown as import("express").Response;
  const next = () => {
    nextCalled = true;
  };

  validateInviteRole(req, res, next);
  return { statusCode, payload, nextCalled };
}

describe("Invitation guard — header validation", () => {
  it("rejects request with no x-user-role header (401, defense in depth)", () => {
    // Build a req without setting the header at all.
    let statusCode = 200;
    let nextCalled = false;
    const req = { headers: {}, body: { role: "customer", projectId: 5, email: "x@y.z" } } as unknown as import("express").Request;
    const res = {
      status(c: number) { statusCode = c; return this; },
      json(_p: unknown) { return this; },
    } as unknown as import("express").Response;
    validateInviteRole(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false, "must not pass through without inviter role");
    assert.equal(statusCode, 401);
  });

  it("rejects request with empty x-user-role header (401)", () => {
    const r = runInviteValidator({ inviterRole: "", body: { role: "customer", projectId: 5 } });
    assert.equal(r.nextCalled, false);
    assert.equal(r.statusCode, 401);
  });

  it("rejects request with unknown x-user-role header (401, no silent demotion to collaborator)", () => {
    const r = runInviteValidator({
      inviterRole: "totally-made-up-role",
      body: { role: "customer", projectId: 5 },
    });
    assert.equal(r.nextCalled, false, "unknown role must not be silently treated as collaborator");
    assert.equal(r.statusCode, 401);
  });

  it("accepts a recognized legacy role string (e.g. 'Admin')", () => {
    const r = runInviteValidator({
      inviterRole: "Admin",
      body: { role: "super_user" },
    });
    assert.equal(r.nextCalled, true);
  });

  it("rejects request with missing body.role (400)", () => {
    const r = runInviteValidator({
      inviterRole: "account_admin",
      body: {} as { role: string },
    });
    assert.equal(r.nextCalled, false);
    assert.equal(r.statusCode, 400);
  });

  it("rejects request with empty body.role (400)", () => {
    const r = runInviteValidator({
      inviterRole: "account_admin",
      body: { role: "" },
    });
    assert.equal(r.nextCalled, false);
    assert.equal(r.statusCode, 400);
  });
});

describe("Invitation matrix — SUPER_USER cannot escalate", () => {
  it("rejects super_user inviting an account_admin (privilege escalation)", () => {
    const r = runInviteValidator({
      inviterRole: "super_user",
      body: { role: "account_admin" },
    });
    assert.equal(r.nextCalled, false);
    assert.equal(r.statusCode, 403);
  });

  it("allows super_user inviting a collaborator", () => {
    const r = runInviteValidator({
      inviterRole: "super_user",
      body: { role: "collaborator" },
    });
    assert.equal(r.nextCalled, true);
    assert.equal(r.statusCode, 200);
  });

  it("allows super_user inviting a customer when projectId is supplied", () => {
    const r = runInviteValidator({
      inviterRole: "super_user",
      body: { role: "customer", projectId: 42 },
    });
    assert.equal(r.nextCalled, true);
  });

  it("rejects super_user inviting a customer without projectId", () => {
    const r = runInviteValidator({
      inviterRole: "super_user",
      body: { role: "customer" },
    });
    assert.equal(r.nextCalled, false);
    assert.equal(r.statusCode, 400);
  });
});

describe("Invitation matrix — other tiers", () => {
  it("collaborator can only invite customers, and only with projectId", () => {
    assert.equal(
      runInviteValidator({ inviterRole: "collaborator", body: { role: "customer", projectId: 7 } }).nextCalled,
      true,
    );
    assert.equal(
      runInviteValidator({ inviterRole: "collaborator", body: { role: "customer" } }).nextCalled,
      false,
    );
    assert.equal(
      runInviteValidator({ inviterRole: "collaborator", body: { role: "collaborator" } }).nextCalled,
      false,
    );
  });

  it("customer cannot invite anyone", () => {
    assert.equal(
      runInviteValidator({ inviterRole: "customer", body: { role: "customer", projectId: 1 } }).nextCalled,
      false,
    );
  });

  it("account_admin can invite any role (and need not pass projectId for non-customer roles)", () => {
    assert.equal(
      runInviteValidator({ inviterRole: "account_admin", body: { role: "super_user" } }).nextCalled,
      true,
    );
    assert.equal(
      runInviteValidator({ inviterRole: "account_admin", body: { role: "account_admin" } }).nextCalled,
      true,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  4. resolveProjectRole — account-role ceiling (Phase 5)             */
/* ------------------------------------------------------------------ */

describe("resolveProjectRole — account role is the ceiling", () => {
  it("account_admin always resolves to project 'admin'", () => {
    assert.equal(resolveProjectRole("account_admin", undefined), "admin");
    assert.equal(resolveProjectRole("account_admin", "collaborator"), "admin");
    assert.equal(resolveProjectRole("account_admin", "customer"), "admin");
    assert.equal(resolveProjectRole("account_admin", "admin"), "admin");
  });

  it("super_user always resolves to project 'admin'", () => {
    assert.equal(resolveProjectRole("super_user", undefined), "admin");
    assert.equal(resolveProjectRole("super_user", "collaborator"), "admin");
  });

  it("collaborator uses projectRole, defaulting to 'collaborator'", () => {
    assert.equal(resolveProjectRole("collaborator", undefined), "collaborator");
    assert.equal(resolveProjectRole("collaborator", null), "collaborator");
    assert.equal(resolveProjectRole("collaborator", "customer"), "customer");
  });

  it("collaborator at account level CANNOT be promoted to project 'admin'", () => {
    // Stale or malicious project_role='admin' must be demoted to 'collaborator'.
    assert.equal(resolveProjectRole("collaborator", "admin"), "collaborator");
  });

  it("customer is locked to 'customer' regardless of projectRole", () => {
    assert.equal(resolveProjectRole("customer", undefined), "customer");
    assert.equal(resolveProjectRole("customer", "admin"), "customer");
    assert.equal(resolveProjectRole("customer", "collaborator"), "customer");
  });

  it("legacy/title-case account roles resolve correctly", () => {
    assert.equal(resolveProjectRole("Admin", undefined), "admin");           // → account_admin → admin
    assert.equal(resolveProjectRole("PM", undefined), "admin");              // → super_user → admin
    assert.equal(resolveProjectRole("Project Manager", undefined), "admin"); // demo job-title mapping
  });
});

describe("canOnProjectFor — combined ceiling + matrix", () => {
  it("collaborator-on-account with stale projectRole='admin' cannot delete phases", () => {
    assert.equal(
      canOnProjectFor("collaborator", "admin", "phase.delete"),
      false,
      "ceiling must demote stale admin row to collaborator",
    );
  });

  it("super_user-on-account with no membership row still gets admin powers", () => {
    assert.equal(canOnProjectFor("super_user", undefined, "phase.create"), true);
  });

  it("customer-on-account cannot delete milestones via any projectRole", () => {
    assert.equal(canOnProjectFor("customer", "admin", "milestone.delete"), false);
  });
});

/* ------------------------------------------------------------------ */
/*  5. resolveRole — legacy + canonical pass-through                   */
/* ------------------------------------------------------------------ */

describe("resolveRole — legacy + canonical mapping", () => {
  it("canonical strings pass through unchanged", () => {
    assert.equal(resolveRole("account_admin"), "account_admin");
    assert.equal(resolveRole("super_user"), "super_user");
    assert.equal(resolveRole("collaborator"), "collaborator");
    assert.equal(resolveRole("customer"), "customer");
  });

  it("legacy strings map to canonical roles", () => {
    assert.equal(resolveRole("Admin"), "account_admin");
    assert.equal(resolveRole("PM"), "super_user");
  });

  it("maps 'Resource Manager' to super_user", () => {
    assert.equal(resolveRole("Resource Manager"), "super_user");
  });

  it("unknown roles fall back to 'collaborator' (safe minimum)", () => {
    assert.equal(resolveRole("totally-made-up-role"), "collaborator");
  });
});

/* ------------------------------------------------------------------ */
/*  6. reports.view — new permission gate                              */
/* ------------------------------------------------------------------ */

describe("reports.view — gate checks", () => {
  it("account_admin can view reports", () => {
    assert.equal(can(ROLES.ACCOUNT_ADMIN, "reports.view"), true);
  });

  it("super_user can view reports", () => {
    assert.equal(can(ROLES.SUPER_USER, "reports.view"), true);
  });

  it("collaborator CANNOT view reports", () => {
    assert.equal(can(ROLES.COLLABORATOR, "reports.view"), false);
  });

  it("customer CANNOT view reports", () => {
    assert.equal(can(ROLES.CUSTOMER, "reports.view"), false);
  });
});

/* ------------------------------------------------------------------ */
/*  7. financials.viewCostRates — account_admin only                   */
/* ------------------------------------------------------------------ */

describe("financials.viewCostRates — account_admin exclusive", () => {
  it("account_admin CAN view cost rates", () => {
    assert.equal(can(ROLES.ACCOUNT_ADMIN, "financials.viewCostRates"), true);
  });

  it("super_user CANNOT view cost rates", () => {
    assert.equal(
      can(ROLES.SUPER_USER, "financials.viewCostRates"),
      false,
      "cost rates must be account_admin-only",
    );
  });

  it("collaborator CANNOT view cost rates", () => {
    assert.equal(can(ROLES.COLLABORATOR, "financials.viewCostRates"), false);
  });
});
