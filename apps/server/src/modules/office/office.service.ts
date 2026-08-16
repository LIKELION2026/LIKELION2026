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
  type UpdateOfficeAttendanceRequest,
  type UpdateOfficePresenceRequest
} from "@likelion2026/shared";
import { randomInt, randomUUID } from "node:crypto";

import { SUPABASE_CLIENT } from "../../integrations/supabase/supabase.constants";

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

const AVATAR_IDS = [
  "office-avatar-01",
  "office-avatar-02",
  "office-avatar-03",
  "office-avatar-04",
  "office-avatar-05",
  "office-avatar-06"
] as const;

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

  async connectRealtimeMember(
    memberId: string,
    guestToken: string
  ): Promise<OfficeMemberPresence> {
    const member = await this.requireMemberOwnership(memberId, guestToken);
    const presence = await this.updateRealtimePresence(memberId, {
      connection_status: "connected",
      disconnected_at: null,
      last_active_at: new Date().toISOString(),
      last_heartbeat_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
        avatar_id: AVATAR_IDS[randomInt(AVATAR_IDS.length)],
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

function toRealtimeMember(
  member: MemberRow,
  presence: PresenceRow
): OfficeMemberPresence {
  return {
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
