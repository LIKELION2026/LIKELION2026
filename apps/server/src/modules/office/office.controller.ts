import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query
} from "@nestjs/common";
import type {
  CalendarEventListResponse,
  CalendarMemberStatusListResponse,
  GuestOfficeSessionResponse,
  OfficeCollaborationPresence,
  OfficeTodoListResponse,
  PublicOfficeTodoListResponse
} from "@likelion2026/shared";

import { CreateGuestOfficeSessionDto } from "./dto/create-guest-office-session.dto";
import { CreateOfficeTodoDto } from "./dto/create-office-todo.dto";
import { CreateOfficeCalendarEventDto } from "./dto/create-office-calendar-event.dto";
import { DeleteOfficeCalendarEventQueryDto } from "./dto/delete-office-calendar-event-query.dto";
import { GetCalendarMemberStatusesQueryDto } from "./dto/get-calendar-member-statuses-query.dto";
import { GetMemberTodosQueryDto } from "./dto/get-member-todos-query.dto";
import { GetWorkspaceCalendarEventsQueryDto } from "./dto/get-workspace-calendar-events-query.dto";
import { UpdateOfficeAttendanceDto } from "./dto/update-office-attendance.dto";
import { UpdateOfficePresenceDto } from "./dto/update-office-presence.dto";
import { UpdateOfficeTodoDto } from "./dto/update-office-todo.dto";
import { UpdateOfficeCalendarEventDto } from "./dto/update-office-calendar-event.dto";
import { PresenceGateway } from "../presence/presence.gateway";
import { OfficeService } from "./office.service";

@Controller("office")
export class OfficeController {
  constructor(
    private readonly officeService: OfficeService,
    private readonly presenceGateway: PresenceGateway
  ) {}

  @Post("session")
  createOrRestoreSession(
    @Body() request: CreateGuestOfficeSessionDto
  ): Promise<GuestOfficeSessionResponse> {
    return this.officeService.createOrRestoreSession(request);
  }

  @Patch("members/:memberId/attendance")
  updateAttendance(
    @Param("memberId") memberId: string,
    @Body() request: UpdateOfficeAttendanceDto
  ): Promise<OfficeCollaborationPresence> {
    return this.officeService.updateAttendance(memberId, request);
  }

  @Patch("members/:memberId/presence")
  updatePresence(
    @Param("memberId") memberId: string,
    @Body() request: UpdateOfficePresenceDto
  ): Promise<OfficeCollaborationPresence> {
    return this.officeService.updatePresence(memberId, request);
  }

  @Post("members/:memberId/todos")
  async createTodo(
    @Param("memberId") memberId: string,
    @Body() request: CreateOfficeTodoDto
  ): Promise<OfficeTodoListResponse> {
    const todo = await this.officeService.createTodo(memberId, request);
    const teamId = await this.officeService.getMemberWorkspaceId(memberId, request.guestToken);
    this.presenceGateway.publishTodosUpdated({
      memberId,
      occurredAt: new Date().toISOString(),
      teamId
    });

    return { todos: [todo] };
  }

  @Get("members/:memberId/todos")
  async getMemberTodos(
    @Param("memberId") memberId: string,
    @Query() query: GetMemberTodosQueryDto
  ): Promise<OfficeTodoListResponse> {
    return { todos: await this.officeService.getMemberTodos(memberId, query.guestToken) };
  }

  @Get("workspaces/:workspaceId/todos")
  async getPublicWorkspaceTodos(
    @Param("workspaceId") workspaceId: string
  ): Promise<PublicOfficeTodoListResponse> {
    return { todos: await this.officeService.getPublicWorkspaceTodos(workspaceId) };
  }

  @Patch("todos/:todoId")
  async updateTodo(
    @Param("todoId") todoId: string,
    @Body() request: UpdateOfficeTodoDto
  ): Promise<OfficeTodoListResponse> {
    const todo = await this.officeService.updateTodo(todoId, request);
    const teamId = await this.officeService.getTodoWorkspaceId(todoId, request.guestToken);
    this.presenceGateway.publishTodosUpdated({
      memberId: todo.memberId,
      occurredAt: new Date().toISOString(),
      teamId
    });

    return { todos: [todo] };
  }

  @Post("members/:memberId/calendar-events")
  async createCalendarEvent(
    @Param("memberId") memberId: string,
    @Body() request: CreateOfficeCalendarEventDto
  ): Promise<CalendarEventListResponse> {
    return { events: [await this.officeService.createCalendarEvent(memberId, request)] };
  }

  @Get("workspaces/:workspaceId/calendar-events")
  async getWorkspaceCalendarEvents(
    @Param("workspaceId") workspaceId: string,
    @Query() query: GetWorkspaceCalendarEventsQueryDto
  ): Promise<CalendarEventListResponse> {
    return { events: await this.officeService.getWorkspaceCalendarEvents(workspaceId, query) };
  }

  @Get("workspaces/:workspaceId/calendar-statuses")
  async getCalendarMemberStatuses(
    @Param("workspaceId") workspaceId: string,
    @Query() query: GetCalendarMemberStatusesQueryDto
  ): Promise<CalendarMemberStatusListResponse> {
    return {
      statuses: await this.officeService.getCalendarMemberStatuses(
        workspaceId,
        query.at ?? new Date().toISOString()
      )
    };
  }

  @Patch("calendar-events/:eventId")
  async updateCalendarEvent(
    @Param("eventId") eventId: string,
    @Body() request: UpdateOfficeCalendarEventDto
  ): Promise<CalendarEventListResponse> {
    return { events: [await this.officeService.updateCalendarEvent(eventId, request)] };
  }

  @Delete("calendar-events/:eventId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCalendarEvent(
    @Param("eventId") eventId: string,
    @Query() query: DeleteOfficeCalendarEventQueryDto
  ): Promise<void> {
    await this.officeService.deleteCalendarEvent(eventId, query.guestToken);
  }
}
