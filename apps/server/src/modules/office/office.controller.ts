import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import type {
  GuestOfficeSessionResponse,
  OfficeCollaborationPresence,
  OfficeTodoListResponse,
  PublicOfficeTodoListResponse
} from "@likelion2026/shared";

import { CreateGuestOfficeSessionDto } from "./dto/create-guest-office-session.dto";
import { CreateOfficeTodoDto } from "./dto/create-office-todo.dto";
import { GetMemberTodosQueryDto } from "./dto/get-member-todos-query.dto";
import { UpdateOfficeAttendanceDto } from "./dto/update-office-attendance.dto";
import { UpdateOfficePresenceDto } from "./dto/update-office-presence.dto";
import { UpdateOfficeTodoDto } from "./dto/update-office-todo.dto";
import { OfficeService } from "./office.service";

@Controller("office")
export class OfficeController {
  constructor(private readonly officeService: OfficeService) {}

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
    return { todos: [await this.officeService.createTodo(memberId, request)] };
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
    return { todos: [await this.officeService.updateTodo(todoId, request)] };
  }
}
