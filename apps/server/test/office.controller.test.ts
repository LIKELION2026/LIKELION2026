import assert from "node:assert/strict";
import { test } from "node:test";

import { OfficeController } from "../src/modules/office/office.controller";

test("createTodo publishes a workspace TODO update after saving", async () => {
  const officeService = createOfficeService();
  const presenceGateway = createPresenceGateway();
  const controller = new OfficeController(officeService as never, presenceGateway as never);

  const response = await controller.createTodo("member-1", {
    guestToken: "guest_token",
    title: "Translate the briefing"
  });

  assert.equal(response.todos[0]?.id, "todo-1");
  assert.deepEqual(presenceGateway.events, [
    {
      memberId: "member-1",
      teamId: "workspace-1"
    }
  ]);
});

test("updateTodo publishes a workspace TODO update after saving", async () => {
  const officeService = createOfficeService();
  const presenceGateway = createPresenceGateway();
  const controller = new OfficeController(officeService as never, presenceGateway as never);

  const response = await controller.updateTodo("todo-1", {
    guestToken: "guest_token",
    status: "done"
  });

  assert.equal(response.todos[0]?.status, "done");
  assert.deepEqual(presenceGateway.events, [
    {
      memberId: "member-1",
      teamId: "workspace-1"
    }
  ]);
});

function createOfficeService(): {
  createTodo(): Promise<{ id: string; memberId: string; status: "planned"; title: string }>;
  getMemberWorkspaceId(): Promise<string>;
  getTodoWorkspaceId(): Promise<string>;
  updateTodo(): Promise<{ id: string; memberId: string; status: "done"; title: string }>;
} {
  return {
    async createTodo() {
      return {
        id: "todo-1",
        memberId: "member-1",
        status: "planned" as const,
        title: "Translate the briefing"
      };
    },
    async getMemberWorkspaceId() {
      return "workspace-1";
    },
    async getTodoWorkspaceId() {
      return "workspace-1";
    },
    async updateTodo() {
      return {
        id: "todo-1",
        memberId: "member-1",
        status: "done" as const,
        title: "Translate the briefing"
      };
    }
  };
}

function createPresenceGateway(): {
  events: Array<{ memberId: string; teamId: string }>;
  publishTodosUpdated(payload: { memberId: string; teamId: string }): void;
} {
  return {
    events: [],
    publishTodosUpdated(payload) {
      this.events.push({ memberId: payload.memberId, teamId: payload.teamId });
    }
  };
}
