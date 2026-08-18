import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type CreateGuestOfficeSessionRequest,
  type GuestOfficeSessionResponse,
  type OfficeCollaborationPresence,
  type OfficeDesk,
  type OfficeMemberPresence,
  type OfficeMember,
  type OfficeAvatarState,
  type MemberStatus,
  type OfficeTodo,
  type OfficeCalendarEvent,
  type CalendarMemberStatus,
  type PublicOfficeTodo,
  type CreateOfficeTodoRequest,
  type CreateOfficeCalendarEventRequest,
  type GetWorkspaceCalendarEventsQuery,
  type UpdateOfficeTodoRequest,
  type UpdateOfficeCalendarEventRequest,
  type UpdateOfficeAttendanceRequest,
  type UpdateOfficePresenceRequest
} from "@likelion2026/shared";
import { randomUUID } from "node:crypto";

import { SUPABASE_CLIENT } from "../../integrations/supabase/supabase.constants";
import { selectNewGuestAvatarId } from "./office-avatar";

interface WorkspaceRow {
  id: string;
  name: string;
}

interface MemberRow {
  avatar_id: string;
  country_code: OfficeMember["countryCode"];
  guest_token: string;
  id: string;
  name: string;
  preferred_language: OfficeMember["preferredLanguage"];
  workspace_id: string;
}

interface DeskRow {
  assigned_member_id: string | null;
  id: string;
  label: string;
  position_x: number;
  position_y: number;
  workspace_id: string;
  zone: OfficeDesk["zone"];
}

interface PresenceRow {
  attendance_status: OfficeCollaborationPresence["attendanceStatus"];
  availability_status: OfficeCollaborationPresence["availabilityStatus"];
  checked_in_at: string | null;
  checked_out_at: string | null;
  connection_status: OfficeCollaborationPresence["connectionStatus"];
  current_desk_id: string | null;
  disconnected_at: string | null;
  display_mode: OfficeCollaborationPresence["displayMode"];
  last_active_at: string | null;
  last_heartbeat_at: string | null;
  member_id: string;
  position_x: number;
  position_y: number;
  status_message: string | null;
  updated_at: string;
}

interface TodoRow {
  id: string;
  is_public: boolean;
  member_id: string;
  sort_order: number;
  status: OfficeTodo["status"];
  title: string;
}

interface CalendarEventRow {
  created_by_member_id: string | null;
  ends_at: string;
  event_type: OfficeCalendarEvent["eventType"];
  id: string;
  is_all_day: boolean;
  starts_at: string;
  title: string;
  workspace_id: string;
}

interface CalendarParticipantRow {
  calendar_event_id: string;
  member_id: string;
}

const DEFAULT_DESKS = [
  { label: "Korea desk 1", positionX: 192, positionY: 264, zone: "korea-zone" },
  { label: "Korea desk 2", positionX: 288, positionY: 264, zone: "korea-zone" },
  { label: "Korea desk 3", positionX: 384, positionY: 264, zone: "korea-zone" },
  { label: "Vietnam desk 1", positionX: 672, positionY: 264, zone: "vietnam-zone" },
  { label: "Vietnam desk 2", positionX: 768, positionY: 264, zone: "vietnam-zone" },
  { label: "Vietnam desk 3", positionX: 864, positionY: 264, zone: "vietnam-zone" }
] as const satisfies ReadonlyArray<
  Pick<OfficeDesk, "label" | "positionX" | "positionY" | "zone">
>;

@Injectable()
export class OfficeService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient
  ) {}

  async createOrRestoreSession(
    request: CreateGuestOfficeSessionRequest
  ): Promise<GuestOfficeSessionResponse> {
    const guestToken = request.guestToken ?? createGuestToken();
    const existingMember = await this.findMemberByGuestToken(guestToken);

    if (existingMember) {
      const member = await this.updateMemberProfile(existingMember.id, request);
      const desk = await this.ensureAssignedDesk(member.workspaceId, member.id);
      const presence = await this.ensurePresence(member.id, desk);

      return { desk, guestToken, member, presence };
    }

    const workspace = await this.ensureWorkspace();
    const member = await this.createMember(workspace.id, guestToken, request);
    const desk = await this.claimAvailableDesk(workspace.id, member.id);
    const presence = await this.ensurePresence(member.id, desk);

    return { desk, guestToken, member, presence };
  }

  async updateAttendance(
    memberId: string,
    request: UpdateOfficeAttendanceRequest
  ): Promise<OfficeCollaborationPresence> {
    await this.requireMemberOwnership(memberId, request.guestToken);
    const now = new Date().toISOString();
    const isWorking = request.attendanceStatus === "working";
    const { data, error } = await this.supabase
      .from("member_presence")
      .update({
        attendance_status: request.attendanceStatus,
        checked_in_at: isWorking ? now : null,
        checked_out_at: isWorking ? null : now,
        display_mode: isWorking ? "active" : "sleeping",
        last_active_at: now,
        status_message: request.statusMessage ?? (isWorking ? "근무 중" : "퇴근"),
        updated_at: now
      })
      .eq("member_id", memberId)
      .select()
      .single();

    this.throwIfError(error, "update office attendance");
    await this.recordAttendance(memberId, isWorking ? "check_in" : "check_out");

    return toPresence(data as PresenceRow);
  }

  async updatePresence(
    memberId: string,
    request: UpdateOfficePresenceRequest
  ): Promise<OfficeCollaborationPresence> {
    await this.requireMemberOwnership(memberId, request.guestToken);
    const now = new Date().toISOString();
    const updates: Record<string, string | number> = {
      last_active_at: now,
      updated_at: now
    };

    if (request.availabilityStatus) {
      updates.availability_status = request.availabilityStatus;
    }
    if (request.positionX !== undefined) {
      updates.position_x = request.positionX;
    }
    if (request.positionY !== undefined) {
      updates.position_y = request.positionY;
    }
    if (request.statusMessage !== undefined) {
      updates.status_message = request.statusMessage;
    }

    const { data, error } = await this.supabase
      .from("member_presence")
      .update(updates)
      .eq("member_id", memberId)
      .select()
      .single();

    this.throwIfError(error, "update office presence");
    return toPresence(data as PresenceRow);
  }

  async createTodo(
    memberId: string,
    request: CreateOfficeTodoRequest
  ): Promise<OfficeTodo> {
    await this.requireMemberOwnership(memberId, request.guestToken);
    const { data, error } = await this.supabase
      .from("todos")
      .insert({
        is_public: request.isPublic ?? true,
        member_id: memberId,
        sort_order: await this.getNextTodoSortOrder(memberId),
        title: request.title.trim()
      })
      .select("id, is_public, member_id, sort_order, status, title")
      .single();
    this.throwIfError(error, "create office todo");
    return toOfficeTodo(data as TodoRow);
  }

  async getMemberTodos(memberId: string, guestToken: string): Promise<OfficeTodo[]> {
    await this.requireMemberOwnership(memberId, guestToken);
    const { data, error } = await this.supabase
      .from("todos")
      .select("id, is_public, member_id, sort_order, status, title")
      .eq("member_id", memberId)
      .order("sort_order");
    this.throwIfError(error, "read member todos");
    return ((data ?? []) as TodoRow[]).map(toOfficeTodo);
  }

  async getMemberWorkspaceId(memberId: string, guestToken: string): Promise<string> {
    return (await this.requireMemberOwnership(memberId, guestToken)).workspace_id;
  }

  async getTodoWorkspaceId(todoId: string, guestToken: string): Promise<string> {
    const { data, error } = await this.supabase
      .from("todos")
      .select("member_id")
      .eq("id", todoId)
      .maybeSingle();
    this.throwIfError(error, "find office todo workspace");
    if (!data) {
      throw new NotFoundException("Office todo was not found");
    }

    return this.getMemberWorkspaceId(data.member_id as string, guestToken);
  }

  async getPublicWorkspaceTodos(workspaceId: string): Promise<PublicOfficeTodo[]> {
    const { data: memberData, error: memberError } = await this.supabase
      .from("members")
      .select("id, name")
      .eq("workspace_id", workspaceId);
    this.throwIfError(memberError, "read workspace todo members");

    const members = (memberData ?? []) as Array<{ id: string; name: string }>;
    if (members.length === 0) {
      return [];
    }
    const memberNames = new Map(members.map((member) => [member.id, member.name]));
    const { data, error } = await this.supabase
      .from("todos")
      .select("id, is_public, member_id, sort_order, status, title")
      .in("member_id", members.map((member) => member.id))
      .eq("is_public", true)
      .order("sort_order");
    this.throwIfError(error, "read workspace public todos");

    return ((data ?? []) as TodoRow[]).flatMap((todo) => {
      const memberName = memberNames.get(todo.member_id);
      return memberName ? [{ ...toOfficeTodo(todo), memberName }] : [];
    });
  }

  async updateTodo(todoId: string, request: UpdateOfficeTodoRequest): Promise<OfficeTodo> {
    const { data: existing, error: findError } = await this.supabase
      .from("todos")
      .select("member_id")
      .eq("id", todoId)
      .maybeSingle();
    this.throwIfError(findError, "find office todo");
    if (!existing) {
      throw new NotFoundException("Office todo was not found");
    }

    await this.requireMemberOwnership(existing.member_id as string, request.guestToken);
    const updates: Record<string, boolean | number | string> = {};
    if (request.isPublic !== undefined) {
      updates.is_public = request.isPublic;
    }
    if (request.sortOrder !== undefined) {
      updates.sort_order = request.sortOrder;
    }
    if (request.status !== undefined) {
      updates.status = request.status;
    }
    if (request.title !== undefined) {
      updates.title = request.title.trim();
    }
    if (Object.keys(updates).length === 0) {
      throw new ConflictException("No office todo updates were provided");
    }

    const { data, error } = await this.supabase
      .from("todos")
      .update(updates)
      .eq("id", todoId)
      .select("id, is_public, member_id, sort_order, status, title")
      .single();
    this.throwIfError(error, "update office todo");
    return toOfficeTodo(data as TodoRow);
  }

  async createCalendarEvent(
    memberId: string,
    request: CreateOfficeCalendarEventRequest
  ): Promise<OfficeCalendarEvent> {
    const member = await this.requireMemberOwnership(memberId, request.guestToken);
    assertCalendarRange(request.startsAt, request.endsAt);
    const { data, error } = await this.supabase
      .from("calendar_events")
      .insert({
        created_by_member_id: memberId,
        ends_at: request.endsAt,
        event_type: request.eventType,
        is_all_day: request.isAllDay ?? false,
        starts_at: request.startsAt,
        title: request.title.trim(),
        workspace_id: member.workspace_id
      })
      .select("created_by_member_id, ends_at, event_type, id, is_all_day, starts_at, title, workspace_id")
      .single();
    this.throwIfError(error, "create calendar event");

    const event = data as CalendarEventRow;
    const { error: participantError } = await this.supabase
      .from("calendar_event_participants")
      .insert({ calendar_event_id: event.id, member_id: memberId });
    this.throwIfError(participantError, "add calendar event participant");
    return { ...toCalendarEvent(event), participantMemberIds: [memberId] };
  }

  async getWorkspaceCalendarEvents(
    workspaceId: string,
    query: GetWorkspaceCalendarEventsQuery
  ): Promise<OfficeCalendarEvent[]> {
    assertCalendarRange(query.startsAt, query.endsAt);
    const { data, error } = await this.supabase
      .from("calendar_events")
      .select("created_by_member_id, ends_at, event_type, id, is_all_day, starts_at, title, workspace_id")
      .eq("workspace_id", workspaceId)
      .lt("starts_at", query.endsAt)
      .gt("ends_at", query.startsAt)
      .order("starts_at");
    this.throwIfError(error, "read workspace calendar events");
    return this.withCalendarParticipants((data ?? []) as CalendarEventRow[]);
  }

  async getCalendarMemberStatuses(
    workspaceId: string,
    at: string
  ): Promise<CalendarMemberStatus[]> {
    const events = await this.getWorkspaceCalendarEvents(workspaceId, {
      endsAt: new Date(new Date(at).getTime() + 1).toISOString(),
      startsAt: at
    });
    const activeEvents = events.filter((event) => event.startsAt <= at && event.endsAt > at);
    const statuses = new Map<string, CalendarMemberStatus>();
    for (const event of activeEvents) {
      for (const memberId of event.participantMemberIds) {
        const next = toCalendarMemberStatus(event, memberId);
        const existing = statuses.get(memberId);
        if (!existing || calendarPriority(next.eventType) > calendarPriority(existing.eventType)) {
          statuses.set(memberId, next);
        }
      }
    }
    return [...statuses.values()];
  }

  async updateCalendarEvent(
    eventId: string,
    request: UpdateOfficeCalendarEventRequest
  ): Promise<OfficeCalendarEvent> {
    const existing = await this.requireCalendarEventOwnership(eventId, request.guestToken);
    const startsAt = request.startsAt ?? existing.starts_at;
    const endsAt = request.endsAt ?? existing.ends_at;
    assertCalendarRange(startsAt, endsAt);
    const updates: Record<string, boolean | string> = {};
    if (request.endsAt !== undefined) updates.ends_at = request.endsAt;
    if (request.eventType !== undefined) updates.event_type = request.eventType;
    if (request.isAllDay !== undefined) updates.is_all_day = request.isAllDay;
    if (request.startsAt !== undefined) updates.starts_at = request.startsAt;
    if (request.title !== undefined) updates.title = request.title.trim();
    if (Object.keys(updates).length === 0) {
      throw new ConflictException("No calendar event updates were provided");
    }
    const { data, error } = await this.supabase
      .from("calendar_events")
      .update(updates)
      .eq("id", eventId)
      .select("created_by_member_id, ends_at, event_type, id, is_all_day, starts_at, title, workspace_id")
      .single();
    this.throwIfError(error, "update calendar event");
    return (await this.withCalendarParticipants([data as CalendarEventRow]))[0];
  }

  async deleteCalendarEvent(eventId: string, guestToken: string): Promise<string> {
    const event = await this.requireCalendarEventOwnership(eventId, guestToken);
    const { error } = await this.supabase.from("calendar_events").delete().eq("id", eventId);
    this.throwIfError(error, "delete calendar event");
    return event.workspace_id;
  }

  async connectRealtimeMember(
    memberId: string,
    guestToken: string
  ): Promise<OfficeMemberPresence> {
    const member = await this.requireMemberOwnership(memberId, guestToken);
    const now = new Date().toISOString();
    const presence = await this.updateRealtimePresence(memberId, {
      attendance_status: "working",
      checked_in_at: now,
      checked_out_at: null,
      connection_status: "connected",
      disconnected_at: null,
      display_mode: "active",
      last_active_at: now,
      last_heartbeat_at: now,
      status_message: "근무 중",
      updated_at: now
    });

    await this.recordAttendance(memberId, "reconnect");
    return toRealtimeMember(member, presence);
  }

  async disconnectRealtimeMember(
    memberId: string,
    guestToken: string,
    avatar?: OfficeAvatarState
  ): Promise<OfficeMemberPresence> {
    const member = await this.requireMemberOwnership(memberId, guestToken);
    const now = new Date().toISOString();
    const presence = await this.updateRealtimePresence(memberId, {
      connection_status: "disconnected",
      disconnected_at: now,
      display_mode: "ghost",
      ...(avatar ? { position_x: avatar.x, position_y: avatar.y } : {}),
      updated_at: now
    });

    await this.recordAttendance(memberId, "disconnect");
    return toRealtimeMember(member, presence);
  }

  async heartbeatRealtimeMember(
    memberId: string,
    guestToken: string,
    avatar?: OfficeAvatarState
  ): Promise<OfficeMemberPresence> {
    const member = await this.requireMemberOwnership(memberId, guestToken);
    const now = new Date().toISOString();
    const presence = await this.updateRealtimePresence(memberId, {
      connection_status: "connected",
      disconnected_at: null,
      last_active_at: now,
      last_heartbeat_at: now,
      ...(avatar ? { position_x: avatar.x, position_y: avatar.y } : {}),
      updated_at: now
    });

    return toRealtimeMember(member, presence);
  }

  async updateRealtimeMemberPosition(
    memberId: string,
    guestToken: string,
    avatar: OfficeAvatarState
  ): Promise<OfficeMemberPresence> {
    return this.heartbeatRealtimeMember(memberId, guestToken, avatar);
  }

  async updateRealtimeMemberStatus(
    memberId: string,
    guestToken: string,
    status: MemberStatus
  ): Promise<OfficeMemberPresence> {
    const member = await this.requireMemberOwnership(memberId, guestToken);
    const now = new Date().toISOString();
    const presence = await this.updateRealtimePresence(memberId, {
      availability_status: toAvailabilityStatus(status),
      last_active_at: now,
      status_message: getStatusMessage(status),
      updated_at: now
    });

    return toRealtimeMember(member, presence);
  }

  async updateRealtimeMemberAttendance(
    memberId: string,
    guestToken: string,
    attendanceStatus: OfficeCollaborationPresence["attendanceStatus"]
  ): Promise<OfficeMemberPresence> {
    const member = await this.requireMemberOwnership(memberId, guestToken);
    const presence = await this.updateAttendance(memberId, {
      attendanceStatus,
      guestToken
    });
    return toRealtimeMember(member, toPresenceRow(presence));
  }

  async getWorkspaceRealtimeMembers(workspaceId: string): Promise<OfficeMemberPresence[]> {
    const { data: memberData, error: memberError } = await this.supabase
      .from("members")
      .select("avatar_id, country_code, guest_token, id, name, preferred_language, workspace_id")
      .eq("workspace_id", workspaceId);
    this.throwIfError(memberError, "read workspace members");

    const members = (memberData ?? []) as MemberRow[];
    if (members.length === 0) {
      return [];
    }

    const { data: presenceData, error: presenceError } = await this.supabase
      .from("member_presence")
      .select("attendance_status, availability_status, checked_in_at, checked_out_at, connection_status, current_desk_id, disconnected_at, display_mode, last_active_at, last_heartbeat_at, member_id, position_x, position_y, status_message, updated_at")
      .in(
        "member_id",
        members.map((member) => member.id)
      );
    this.throwIfError(presenceError, "read workspace presence");

    const presences = new Map(
      ((presenceData ?? []) as PresenceRow[]).map((presence) => [
        presence.member_id,
        presence
      ])
    );
    return members
      .map((member) => {
        const presence = presences.get(member.id);
        return presence ? toRealtimeMember(member, presence) : null;
      })
      .filter((member): member is OfficeMemberPresence => member !== null);
  }

  private async ensureWorkspace(): Promise<WorkspaceRow> {
    const workspaceName = this.configService.getOrThrow<string>(
      "supabase.officeWorkspaceName"
    );
    const { data: existing, error: findError } = await this.supabase
      .from("workspaces")
      .select("id, name")
      .eq("name", workspaceName)
      .maybeSingle();

    this.throwIfError(findError, "find office workspace");
    const workspace = existing
      ? (existing as WorkspaceRow)
      : await this.createWorkspace(workspaceName);

    await this.ensureDesks(workspace.id);
    return workspace;
  }

  private async getNextTodoSortOrder(memberId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("todos")
      .select("sort_order")
      .eq("member_id", memberId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    this.throwIfError(error, "read next office todo order");
    return data ? Number(data.sort_order) + 1 : 0;
  }

  private async requireCalendarEventOwnership(
    eventId: string,
    guestToken: string
  ): Promise<CalendarEventRow> {
    const { data, error } = await this.supabase
      .from("calendar_events")
      .select("created_by_member_id, ends_at, event_type, id, is_all_day, starts_at, title, workspace_id")
      .eq("id", eventId)
      .maybeSingle();
    this.throwIfError(error, "find calendar event");
    if (!data) throw new NotFoundException("Calendar event was not found");
    const event = data as CalendarEventRow;
    if (!event.created_by_member_id) throw new ConflictException("Calendar event has no owner");
    await this.requireMemberOwnership(event.created_by_member_id, guestToken);
    return event;
  }

  private async withCalendarParticipants(events: CalendarEventRow[]): Promise<OfficeCalendarEvent[]> {
    if (events.length === 0) return [];
    const { data, error } = await this.supabase
      .from("calendar_event_participants")
      .select("calendar_event_id, member_id")
      .in("calendar_event_id", events.map((event) => event.id));
    this.throwIfError(error, "read calendar event participants");
    const participantsByEvent = new Map<string, string[]>();
    for (const row of (data ?? []) as CalendarParticipantRow[]) {
      participantsByEvent.set(row.calendar_event_id, [
        ...(participantsByEvent.get(row.calendar_event_id) ?? []),
        row.member_id
      ]);
    }
    return events.map((event) => ({
      ...toCalendarEvent(event),
      participantMemberIds: participantsByEvent.get(event.id) ?? []
    }));
  }

  private async createWorkspace(name: string): Promise<WorkspaceRow> {
    const { data, error } = await this.supabase
      .from("workspaces")
      .insert({ default_language: "ko", name })
      .select("id, name")
      .single();

    this.throwIfError(error, "create office workspace");
    return data as WorkspaceRow;
  }

  private async ensureDesks(workspaceId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from("desks")
      .select("label")
      .eq("workspace_id", workspaceId);

    this.throwIfError(error, "read office desks");
    const existingLabels = new Set(
      ((data ?? []) as Array<Pick<DeskRow, "label">>).map((desk) => desk.label)
    );
    const missingDesks = DEFAULT_DESKS.filter(
      (desk) => !existingLabels.has(desk.label)
    ).map((desk) => ({
      label: desk.label,
      position_x: desk.positionX,
      position_y: desk.positionY,
      workspace_id: workspaceId,
      zone: desk.zone
    }));

    if (missingDesks.length === 0) {
      return;
    }

    const { error: insertError } = await this.supabase
      .from("desks")
      .insert(missingDesks);
    this.throwIfError(insertError, "create office desks");
  }

  private async findAvailableDesk(workspaceId: string): Promise<OfficeDesk> {
    const { data, error } = await this.supabase
      .from("desks")
      .select("assigned_member_id, id, label, position_x, position_y, workspace_id, zone")
      .eq("workspace_id", workspaceId)
      .is("assigned_member_id", null)
      .order("label")
      .limit(1)
      .maybeSingle();

    this.throwIfError(error, "find available office desk");
    if (!data) {
      throw new ConflictException("No available desk remains in this office");
    }

    return toDesk(data as DeskRow);
  }

  private async ensureAssignedDesk(
    workspaceId: string,
    memberId: string
  ): Promise<OfficeDesk> {
    const { data, error } = await this.supabase
      .from("desks")
      .select("assigned_member_id, id, label, position_x, position_y, workspace_id, zone")
      .eq("workspace_id", workspaceId)
      .eq("assigned_member_id", memberId)
      .maybeSingle();

    this.throwIfError(error, "find member office desk");
    if (data) {
      return toDesk(data as DeskRow);
    }

    return this.claimAvailableDesk(workspaceId, memberId);
  }

  private async claimAvailableDesk(
    workspaceId: string,
    memberId: string
  ): Promise<OfficeDesk> {
    for (let attempt = 0; attempt < DEFAULT_DESKS.length; attempt += 1) {
      const candidate = await this.findAvailableDesk(workspaceId);
      const { data, error } = await this.supabase
        .from("desks")
        .update({ assigned_member_id: memberId })
        .eq("id", candidate.id)
        .is("assigned_member_id", null)
        .select("assigned_member_id, id, label, position_x, position_y, workspace_id, zone")
        .maybeSingle();

      this.throwIfError(error, "claim office desk");
      if (data) {
        return toDesk(data as DeskRow);
      }
    }

    throw new ConflictException("No available desk remains in this office");
  }

  private async createMember(
    workspaceId: string,
    guestToken: string,
    request: CreateGuestOfficeSessionRequest
  ): Promise<OfficeMember> {
    const { data, error } = await this.supabase
      .from("members")
      .insert({
        avatar_id: selectNewGuestAvatarId(),
        country_code: request.countryCode,
        guest_token: guestToken,
        name: request.displayName.trim(),
        preferred_language: request.language,
        workspace_id: workspaceId
      })
      .select("avatar_id, country_code, guest_token, id, name, preferred_language, workspace_id")
      .single();

    this.throwIfError(error, "create office member");
    return toMember(data as MemberRow);
  }

  private async updateMemberProfile(
    memberId: string,
    request: CreateGuestOfficeSessionRequest
  ): Promise<OfficeMember> {
    const { data, error } = await this.supabase
      .from("members")
      .update({
        country_code: request.countryCode,
        name: request.displayName.trim(),
        preferred_language: request.language,
        updated_at: new Date().toISOString()
      })
      .eq("id", memberId)
      .select("avatar_id, country_code, guest_token, id, name, preferred_language, workspace_id")
      .single();

    this.throwIfError(error, "update office member");
    return toMember(data as MemberRow);
  }

  private async findMemberByGuestToken(
    guestToken: string
  ): Promise<MemberRow | null> {
    const { data, error } = await this.supabase
      .from("members")
      .select("avatar_id, country_code, guest_token, id, name, preferred_language, workspace_id")
      .eq("guest_token", guestToken)
      .maybeSingle();

    this.throwIfError(error, "find guest office member");
    return data ? (data as MemberRow) : null;
  }

  private async ensurePresence(
    memberId: string,
    desk: OfficeDesk
  ): Promise<OfficeCollaborationPresence> {
    const { data: existing, error: findError } = await this.supabase
      .from("member_presence")
      .select("attendance_status, availability_status, checked_in_at, checked_out_at, connection_status, current_desk_id, disconnected_at, display_mode, last_active_at, last_heartbeat_at, member_id, position_x, position_y, status_message, updated_at")
      .eq("member_id", memberId)
      .maybeSingle();

    this.throwIfError(findError, "find office presence");
    if (existing) {
      return toPresence(existing as PresenceRow);
    }

    const { data, error } = await this.supabase
      .from("member_presence")
      .insert({
        attendance_status: "checked_out",
        availability_status: "available",
        connection_status: "disconnected",
        current_desk_id: desk.id,
        display_mode: "ghost",
        member_id: memberId,
        position_x: desk.positionX,
        position_y: desk.positionY,
        status_message: "퇴근"
      })
      .select("attendance_status, availability_status, checked_in_at, checked_out_at, connection_status, current_desk_id, disconnected_at, display_mode, last_active_at, last_heartbeat_at, member_id, position_x, position_y, status_message, updated_at")
      .single();

    this.throwIfError(error, "create office presence");
    return toPresence(data as PresenceRow);
  }

  private async requireMemberOwnership(
    memberId: string,
    guestToken: string
  ): Promise<MemberRow> {
    const { data, error } = await this.supabase
      .from("members")
      .select("avatar_id, country_code, guest_token, id, name, preferred_language, workspace_id")
      .eq("id", memberId)
      .eq("guest_token", guestToken)
      .maybeSingle();

    this.throwIfError(error, "verify guest office member");
    if (!data) {
      throw new NotFoundException("Office member was not found for this guest token");
    }

    return data as MemberRow;
  }

  private async updateRealtimePresence(
    memberId: string,
    updates: Record<string, string | number | null>
  ): Promise<PresenceRow> {
    const { data, error } = await this.supabase
      .from("member_presence")
      .update(updates)
      .eq("member_id", memberId)
      .select("attendance_status, availability_status, checked_in_at, checked_out_at, connection_status, current_desk_id, disconnected_at, display_mode, last_active_at, last_heartbeat_at, member_id, position_x, position_y, status_message, updated_at")
      .single();
    this.throwIfError(error, "update realtime office presence");
    return data as PresenceRow;
  }

  private async recordAttendance(
    memberId: string,
    action: "check_in" | "check_out" | "disconnect" | "reconnect"
  ): Promise<void> {
    const { error } = await this.supabase
      .from("attendance_logs")
      .insert({ action, member_id: memberId });
    this.throwIfError(error, "record office attendance");
  }

  private throwIfError(error: { message: string } | null, operation: string): void {
    if (error) {
      throw new InternalServerErrorException(`Failed to ${operation}`);
    }
  }
}

function createGuestToken(): string {
  return `guest_${randomUUID().replaceAll("-", "")}`;
}

function toMember(row: MemberRow): OfficeMember {
  return {
    avatarId: row.avatar_id,
    countryCode: row.country_code,
    guestToken: row.guest_token,
    id: row.id,
    name: row.name,
    preferredLanguage: row.preferred_language,
    workspaceId: row.workspace_id
  };
}

function toDesk(row: DeskRow): OfficeDesk {
  return {
    ...(row.assigned_member_id ? { assignedMemberId: row.assigned_member_id } : {}),
    id: row.id,
    label: row.label,
    positionX: row.position_x,
    positionY: row.position_y,
    workspaceId: row.workspace_id,
    zone: row.zone
  };
}

function toPresence(row: PresenceRow): OfficeCollaborationPresence {
  return {
    attendanceStatus: row.attendance_status,
    availabilityStatus: row.availability_status,
    avatar: {
      animation: "idle",
      direction: "down",
      x: row.position_x,
      y: row.position_y
    },
    ...(row.checked_in_at ? { checkedInAt: row.checked_in_at } : {}),
    ...(row.checked_out_at ? { checkedOutAt: row.checked_out_at } : {}),
    connectionStatus: row.connection_status,
    ...(row.current_desk_id ? { currentDeskId: row.current_desk_id } : {}),
    ...(row.disconnected_at ? { disconnectedAt: row.disconnected_at } : {}),
    displayMode: row.display_mode,
    ...(row.last_active_at ? { lastActiveAt: row.last_active_at } : {}),
    ...(row.last_heartbeat_at ? { lastHeartbeatAt: row.last_heartbeat_at } : {}),
    memberId: row.member_id,
    ...(row.status_message ? { statusMessage: row.status_message } : {}),
    updatedAt: row.updated_at
  };
}

function toOfficeTodo(row: TodoRow): OfficeTodo {
  return {
    id: row.id,
    isPublic: row.is_public,
    memberId: row.member_id,
    sortOrder: row.sort_order,
    status: row.status,
    title: row.title
  };
}

function toCalendarEvent(row: CalendarEventRow): Omit<OfficeCalendarEvent, "participantMemberIds"> {
  return {
    ...(row.created_by_member_id ? { createdByMemberId: row.created_by_member_id } : {}),
    endsAt: row.ends_at,
    eventType: row.event_type,
    id: row.id,
    isAllDay: row.is_all_day,
    startsAt: row.starts_at,
    title: row.title,
    workspaceId: row.workspace_id
  };
}

function toCalendarMemberStatus(
  event: OfficeCalendarEvent,
  memberId: string
): CalendarMemberStatus {
  const statusByType = {
    absence: { availabilityStatus: "absent", displayMode: "ghost" },
    focus: { availabilityStatus: "focus", displayMode: "active" },
    meeting: { availabilityStatus: "meeting", displayMode: "active" },
    remote_work: { availabilityStatus: "remote_work", displayMode: "remote" },
    vacation: { availabilityStatus: "vacation", displayMode: "vacation" }
  } as const;
  return { ...statusByType[event.eventType], endsAt: event.endsAt, eventId: event.id, eventType: event.eventType, memberId };
}

function calendarPriority(eventType: OfficeCalendarEvent["eventType"]): number {
  return { vacation: 5, absence: 4, meeting: 3, focus: 2, remote_work: 1 }[eventType];
}

function assertCalendarRange(startsAt: string, endsAt: string): void {
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new ConflictException("Calendar event end must be after its start");
  }
}

function toRealtimeMember(
  member: MemberRow,
  presence: PresenceRow
): OfficeMemberPresence {
  return {
    avatarId: member.avatar_id,
    avatar: {
      animation: "idle",
      direction: "down",
      x: presence.position_x,
      y: presence.position_y
    },
    displayName: member.name,
    language: member.preferred_language,
    memberId: member.id,
    officePresence: toPresence(presence),
    status: toMemberStatus(presence.availability_status),
    updatedAt: presence.updated_at
  };
}

function toPresenceRow(presence: OfficeCollaborationPresence): PresenceRow {
  return {
    attendance_status: presence.attendanceStatus,
    availability_status: presence.availabilityStatus,
    checked_in_at: presence.checkedInAt ?? null,
    checked_out_at: presence.checkedOutAt ?? null,
    connection_status: presence.connectionStatus,
    current_desk_id: presence.currentDeskId ?? null,
    disconnected_at: presence.disconnectedAt ?? null,
    display_mode: presence.displayMode,
    last_active_at: presence.lastActiveAt ?? null,
    last_heartbeat_at: presence.lastHeartbeatAt ?? null,
    member_id: presence.memberId,
    position_x: presence.avatar.x,
    position_y: presence.avatar.y,
    status_message: presence.statusMessage ?? null,
    updated_at: presence.updatedAt
  };
}

function toMemberStatus(
  availabilityStatus: OfficeCollaborationPresence["availabilityStatus"]
): OfficeMemberPresence["status"] {
  if (availabilityStatus === "focus") {
    return "focused";
  }
  if (availabilityStatus === "meeting") {
    return "in_meeting";
  }
  if (availabilityStatus === "vacation" || availabilityStatus === "absent") {
    return "away";
  }
  return "available";
}

function toAvailabilityStatus(status: MemberStatus): OfficeCollaborationPresence["availabilityStatus"] {
  if (status === "focused") {
    return "focus";
  }
  if (status === "in_meeting") {
    return "meeting";
  }
  if (status === "away") {
    return "absent";
  }
  return "available";
}

function getStatusMessage(status: MemberStatus): string {
  const messages: Record<MemberStatus, string> = {
    available: "협업 가능",
    away: "자리 비움",
    focused: "집중 작업",
    in_meeting: "회의 중"
  };
  return messages[status];
}
