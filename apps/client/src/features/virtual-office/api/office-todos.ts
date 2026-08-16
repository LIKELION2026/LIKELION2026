import type {
  CreateOfficeTodoRequest,
  OfficeTodoListResponse,
  PublicOfficeTodoListResponse,
  UpdateOfficeTodoRequest
} from "@likelion2026/shared";

import { SERVER_URL } from "../../../shared/config/environment";

export async function createOfficeTodo(
  memberId: string,
  request: CreateOfficeTodoRequest
): Promise<OfficeTodoListResponse> {
  return requestOfficeTodo<OfficeTodoListResponse>(`/office/members/${memberId}/todos`, {
    body: JSON.stringify(request),
    method: "POST"
  });
}

export async function getMemberOfficeTodos(
  memberId: string,
  guestToken: string
): Promise<OfficeTodoListResponse> {
  const query = new URLSearchParams({ guestToken });
  return requestOfficeTodo<OfficeTodoListResponse>(
    `/office/members/${memberId}/todos?${query.toString()}`
  );
}

export async function getPublicWorkspaceTodos(
  workspaceId: string
): Promise<PublicOfficeTodoListResponse> {
  return requestOfficeTodo<PublicOfficeTodoListResponse>(`/office/workspaces/${workspaceId}/todos`);
}

export async function updateOfficeTodo(
  todoId: string,
  request: UpdateOfficeTodoRequest
): Promise<OfficeTodoListResponse> {
  return requestOfficeTodo<OfficeTodoListResponse>(`/office/todos/${todoId}`, {
    body: JSON.stringify(request),
    method: "PATCH"
  });
}

async function requestOfficeTodo<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SERVER_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    throw new Error("TODO 정보를 불러오지 못했습니다.");
  }

  return (await response.json()) as T;
}
