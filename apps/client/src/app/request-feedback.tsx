import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { JSX, ReactNode } from "react";

type FeedbackTone = "error" | "success";

interface FeedbackMessage {
  id: number;
  text: string;
  tone: FeedbackTone;
}

interface RequestFeedbackContextValue {
  showError: (error: unknown, fallback: string) => void;
  showSuccess: (message: string) => void;
}

const RequestFeedbackContext = createContext<RequestFeedbackContextValue | null>(null);

export function RequestFeedbackProvider({ children }: { children: ReactNode }): JSX.Element {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const showMessage = useCallback((text: string, tone: FeedbackTone) => {
    const id = Date.now() + Math.random();
    setMessages((current) => [...current, { id, text, tone }]);
    window.setTimeout(() => {
      setMessages((current) => current.filter((message) => message.id !== id));
    }, 4_500);
  }, []);
  const value = useMemo<RequestFeedbackContextValue>(
    () => ({
      showError: (error, fallback) => showMessage(getRequestErrorMessage(error, fallback), "error"),
      showSuccess: (message) => showMessage(message, "success")
    }),
    [showMessage]
  );

  return (
    <RequestFeedbackContext.Provider value={value}>
      {children}
      <aside aria-live="polite" className="request-feedback-stack">
        {messages.map((message) => (
          <p className={`request-feedback ${message.tone}`} key={message.id} role="status">
            {message.text}
          </p>
        ))}
      </aside>
    </RequestFeedbackContext.Provider>
  );
}

export function useRequestFeedback(): RequestFeedbackContextValue {
  const context = useContext(RequestFeedbackContext);
  if (!context) {
    throw new Error("RequestFeedbackProvider is required.");
  }
  return context;
}

export function RequestSpinner(): JSX.Element {
  return <span aria-label="요청 처리 중" className="request-spinner" role="status" />;
}

export function getRequestErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message.trim()) {
    return fallback;
  }
  if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
    return "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
  }
  return error.message;
}
