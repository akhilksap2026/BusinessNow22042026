/**
 * Skill validation — POST /api/allocations
 *
 * (a) Attempting to allocate a resource who lacks the required skill at the
 *     required proficiency level returns HTTP 422 { error: 'skill_mismatch' }.
 *
 * Run with:  pnpm --filter @workspace/api-server test
 */

import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import app from "../src/app.ts";
import {
  db,
  allocationsTable,
  projectsTable,
  usersTable,
  accountsTable,
  skillsTable,
  userSkillsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const BASE_HEADERS = {
  "content-type": "application/json",
  "x-user-id": "1",
  "x-user-role": "account_admin",
};

describe("POST /api/allocations — skill validation", () => {
  let server: Server;
  let baseUrl: string;
  let testUserId: number;
  let testProjectId: number;
  let testSkillId: number;
  const createdAllocIds: number[] = [];

  before(async () => {
    const [acct] = await db.select().from(accountsTable).limit(1);
    const [user] = await db.select().from(usersTable).limit(1);
    assert.ok(acct && user, "seed must contain at least one account and user");
    testUserId = user.id;

    const today = new Date().toISOString().slice(0, 10);
    const far = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const [proj] = await db.insert(projectsTable).values({
      accountId: acct.id,
      name: "TEST_SKILL_VALIDATION_PROJECT",
      status: "Active",
      ownerId: user.id,
      startDate: today,
      dueDate: far,
      billingType: "Fixed",
      budget: "0",
      budgetedHours: "0",
    } as any).returning();
    testProjectId = proj.id;

    // Insert a dedicated test skill and assign the user "Intermediate" (rank 2).
    const [skill] = await db.insert(skillsTable).values({
      name: "TEST_SKILL_VALIDATION_UNIQUE",
      skillType: "Level",
    }).returning();
    testSkillId = skill.id;

    await db.insert(userSkillsTable).values({
      userId: testUserId,
      skillId: testSkillId,
      proficiencyLevel: "Intermediate",
    });

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    for (const id of createdAllocIds) {
      await db.delete(allocationsTable).where(eq(allocationsTable.id, id)).catch(() => {});
    }
    // Remove user skill row first (FK), then the skill itself.
    await db.delete(userSkillsTable)
      .where(and(eq(userSkillsTable.userId, testUserId), eq(userSkillsTable.skillId, testSkillId)))
      .catch(() => {});
    await db.delete(skillsTable).where(eq(skillsTable.id, testSkillId)).catch(() => {});
    await db.delete(projectsTable).where(eq(projectsTable.id, testProjectId)).catch(() => {});
    if (server) await new Promise<void>((r) => server.close(() => r()));
  });

  function futureRange() {
    const start = new Date(Date.now() + 10 * 86400000);
    const end = new Date(Date.now() + 40 * 86400000);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }

  it("(a) skill mismatch with no override returns 422 skill_mismatch", async () => {
    const { startDate, endDate } = futureRange();
    const res = await fetch(`${baseUrl}/api/allocations`, {
      method: "POST",
      headers: BASE_HEADERS,
      body: JSON.stringify({
        projectId: testProjectId,
        userId: testUserId,
        startDate,
        endDate,
        hoursPerWeek: 20,
        allocationMethod: "hours_per_week",
        methodValue: 20,
        role: "Developer",
        isSoftAllocation: false,
        requiredSkillId: testSkillId,
        requiredProficiencyLevel: 4, // Proficient (rank 4) — user only has Intermediate (rank 2)
      }),
    });

    assert.equal(res.status, 422, `expected 422, got ${res.status}`);
    const body = await res.json() as Record<string, unknown>;
    assert.equal(body.error, "skill_mismatch",
      `expected error:'skill_mismatch', got: ${JSON.stringify(body)}`);
    assert.equal(body.resourceId, testUserId,
      "resourceId must match the user being allocated");
    assert.ok(typeof body.requiredSkill === "string",
      "requiredSkill must be the skill name string");
    assert.equal(body.requiredLevel, 4,
      "requiredLevel must echo back the requested numeric level");
    assert.equal(body.resourceLevel, "Intermediate",
      "resourceLevel must reflect the user's actual stored proficiency");
  });
});
