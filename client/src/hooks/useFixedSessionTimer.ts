import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useFixedSessionTimer() {
  const { logout } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => {
      const start = Number(localStorage.getItem("session_start"));
      const timeoutMinutes = Number(localStorage.getItem("session_timeout") || 30);
      const timeoutMs = timeoutMinutes * 60 * 1000;

      if (!start) return;

      if (Date.now() - start >= timeoutMs) {
        logout();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [logout]);
}
