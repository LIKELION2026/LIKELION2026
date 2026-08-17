import assert from "node:assert/strict";
import { test } from "node:test";

import { OfficeService } from "../src/modules/office/office.service";

test("connectRealtimeMember restores a reconnecting member to working and active", async () => {
  const supabase = createSupabaseFake();
  const service = new OfficeService({} as never, supabase as never);

  const member = await service.connectRealtimeMember(
    "member-1",
    "guest_1234567890abcdef"
  );

  assert.equal(member.officePresence?.attendanceStatus, "working");
  assert.equal(member.officePresence?.connectionStatus, "connected");
  assert.equal(member.officePresence?.displayMode, "active");
  assert.equal(supabase.presenceUpdates[0]?.attendance_status, "working");
  assert.equal(supabase.presenceUpdates[0]?.display_mode, "active");
});

test("updateAttendance keeps an explicit checkout in sleeping display mode", async () => {
  const supabase = createSupabaseFake();
  const service = new OfficeService({} as never, supabase as never);

  const presence = await service.updateAttendance("member-1", {
    attendanceStatus: "checked_out",
    guestToken: "guest_1234567890abcdef"
  });

  assert.equal(presence.attendanceStatus, "checked_out");
  assert.equal(presence.displayMode, "sleeping");
  assert.equal(supabase.presenceUpdates[0]?.display_mode, "sleeping");
});

function createSupabaseFake() {
  const member = {
    avatar_id: "office-avatar-01",
    country_code: "KR",
    guest_token: "guest_1234567890abcdef",
    id: "member-1",
    name: "Korea PM",
    preferred_language: "ko",
    workspace_id: "workspace-1"
  };
  const presence = {
    attendance_status: "checked_out",
    availability_status: "available",
    checked_in_at: null,
    checked_out_at: "2026-08-17T00:00:00.000Z",
    connection_status: "disconnected",
    current_desk_id: "desk-1",
    disconnected_at: "2026-08-17T00:00:00.000Z",
    display_mode: "ghost",
    last_active_at: null,
    last_heartbeat_at: null,
    member_id: "member-1",
    position_x: 192,
    position_y: 264,
    status_message: "퇴근",
    updated_at: "2026-08-17T00:00:00.000Z"
  };
  const presenceUpdates: Array<Record<string, unknown>> = [];

  return {
    presenceUpdates,
    from(table: string) {
      if (table === "members") {
        return {
          select() {
            return {
              eq() {
                return this;
              },
              maybeSingle: async () => ({ data: member, error: null })
            };
          }
        };
      }

      if (table === "member_presence") {
        return {
          update(updates: Record<string, unknown>) {
            presenceUpdates.push(updates);
            Object.assign(presence, updates);
            return {
              eq() {
                return {
                  select() {
                    return {
                      single: async () => ({ data: presence, error: null })
                    };
                  }
                };
              }
            };
          }
        };
      }

      if (table === "attendance_logs") {
        return {
          insert: async () => ({ error: null })
        };
      }

      throw new Error(`Unexpected Supabase table: ${table}`);
    }
  };
}
