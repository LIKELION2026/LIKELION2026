import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CreateOfficeTodoRequest,
  GuestOfficeSessionResponse,
  OfficeTodo,
  PublicOfficeTodo,
  UpdateOfficeTodoRequest
} from "@likelion2026/shared";

import {
  createOfficeTodo,
  deleteOfficeTodo,
  getMemberOfficeTodos,
  getPublicWorkspaceTodos,
  updateOfficeTodo
} from "../api/office-todos";

export interface OfficeTodoController {
  createTodo: (input: CreateTodoInput) => Promise<void>;
  deleteTodo: (todoId: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
  ownTodos: OfficeTodo[];
  publicTodos: PublicOfficeTodo[];
  refresh: () => Promise<void>;
  updateTodo: (todoId: string, input: UpdateTodoInput) => Promise<void>;
}

export type CreateTodoInput = Omit<CreateOfficeTodoRequest, "guestToken">;
export type UpdateTodoInput = Omit<UpdateOfficeTodoRequest, "guestToken">;

export function useOfficeTodos(
  session: GuestOfficeSessionResponse | null
): OfficeTodoController {
  const [ownTodos, setOwnTodos] = useState<OfficeTodo[]>([]);
  const [publicTodos, setPublicTodos] = useState<PublicOfficeTodo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setOwnTodos([]);
      setPublicTodos([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [ownResponse, publicResponse] = await Promise.all([
        getMemberOfficeTodos(session.member.id, session.guestToken),
        getPublicWorkspaceTodos(session.member.workspaceId)
      ]);
      setOwnTodos(ownResponse.todos);
      setPublicTodos(publicResponse.todos);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "TODO 정보를 불러오지 못했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createTodo = useCallback(
    async (input: CreateTodoInput) => {
      if (!session) {
        throw new Error("오피스 세션이 준비되지 않았습니다.");
      }

      await createOfficeTodo(session.member.id, { ...input, guestToken: session.guestToken });
      await refresh();
    },
    [refresh, session]
  );

  const updateTodo = useCallback(
    async (todoId: string, input: UpdateTodoInput) => {
      if (!session) {
        throw new Error("오피스 세션이 준비되지 않았습니다.");
      }

      await updateOfficeTodo(todoId, { ...input, guestToken: session.guestToken });
      await refresh();
    },
    [refresh, session]
  );

  const deleteTodo = useCallback(
    async (todoId: string) => {
      if (!session) {
        throw new Error("오피스 세션이 준비되지 않았습니다.");
      }

      await deleteOfficeTodo(todoId, session.guestToken);
      await refresh();
    },
    [refresh, session]
  );

  return useMemo(
    () => ({ createTodo, deleteTodo, error, isLoading, ownTodos, publicTodos, refresh, updateTodo }),
    [createTodo, deleteTodo, error, isLoading, ownTodos, publicTodos, refresh, updateTodo]
  );
}
