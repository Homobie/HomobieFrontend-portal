import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useSessionTimeout(timeoutMinutes: number) {
  const { logout } = useAuth();
  const timeoutMs = timeoutMinutes * 60 * 1000;

  useEffect(() => {
    if (!timeoutMinutes) return;

    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        logout();
      }, timeoutMs);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    window.addEventListener("touchstart", resetTimer);

    resetTimer();

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      clearTimeout(timer);
    };
  }, [logout, timeoutMs]);
}
