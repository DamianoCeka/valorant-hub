import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface User {
  id: string;
  discordId: string;
  username: string;
  avatar: string | null;
  email?: string | null;
  role: string;
  points: number;
  badges: string[];
}

const AUTH_STORAGE_KEY = "itsme_auth_user";

export function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {}
  return null;
}

export function setStoredUser(user: User | null) {
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (e) {}
}

export function clearStoredUser() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {}
}

async function fetchUser(): Promise<User | null> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.ok) {
      const userData = await res.json();
      setStoredUser(userData);
      return userData;
    } else if (res.status === 401) {
      // Session expired or invalid - clear stale data
      clearStoredUser();
      return null;
    }
  } catch (e) {
    console.error("[Auth] Fetch error:", e);
  }
  
  // Only use stored user as fallback for network errors, not auth failures
  return getStoredUser();
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["auth", "me"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const logout = async () => {
    try {
      // Call server to destroy session first
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("[Auth] Logout API error:", e);
    }
    
    // Always clear local state regardless of server response
    clearStoredUser();
    queryClient.setQueryData(["auth", "me"], null);
    queryClient.clear();
    window.location.href = "/";
  };
  
  const forceLogout = async () => {
    try {
      await fetch("/api/auth/force-logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("[Auth] Force logout API error:", e);
    }
    
    clearStoredUser();
    queryClient.setQueryData(["auth", "me"], null);
    queryClient.clear();
    window.location.href = "/";
  };

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    logout,
    forceLogout,
  };
}
