import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_STORAGE_KEY = "cosync_auth_state";
const PHONE_STORAGE_KEY = "cosync_phone";

export interface CoSyncUser {
  id: number;
  nickname: string | null;
  avatar: string | null;
  phone: string | null;
  bio: string | null;
  gender: number;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

interface AuthState {
  user: CoSyncUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (user: CoSyncUser) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<CoSyncUser>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function CoSyncAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoggedIn: false,
    isLoading: true,
  });

  // 从本地存储恢复登录状态
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const user = JSON.parse(stored) as CoSyncUser;
          setState({ user, isLoggedIn: true, isLoading: false });
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    })();
  }, []);

  const login = useCallback(async (user: CoSyncUser) => {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    if (user.phone) {
      await AsyncStorage.setItem(PHONE_STORAGE_KEY, user.phone);
    }
    setState({ user, isLoggedIn: true, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    await AsyncStorage.removeItem(PHONE_STORAGE_KEY);
    setState({ user: null, isLoggedIn: false, isLoading: false });
  }, []);

  const updateUser = useCallback(async (updates: Partial<CoSyncUser>) => {
    setState((prev) => {
      if (!prev.user) return prev;
      const updated = { ...prev.user, ...updates };
      AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
      return { ...prev, user: updated };
    });
  }, []);

  const refreshUser = useCallback(async () => {
    // 从服务器刷新用户信息 - 在 trpc 调用后使用
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useCoSyncAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useCoSyncAuth must be used within CoSyncAuthProvider");
  }
  return context;
}

// 向后兼容别名
export const PulseAuthProvider = CoSyncAuthProvider;
export const usePulseAuth = useCoSyncAuth;
export type PulseUser = CoSyncUser;
