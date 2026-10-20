/**
 * 用途：提供全局角色状态，并将学生/维修员/管理员选择持久化到 LocalStorage。
 */
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserRole } from "@/lib/types";

interface RoleContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  roleLabel: string;
}

const ROLE_STORAGE_KEY = "campus-computer-care:role";
const ROLE_LABELS: Record<UserRole, string> = {
  student: "学生",
  technician: "维修员",
  admin: "管理员",
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>("student");

  useEffect(() => {
    const storedRole = window.localStorage.getItem(ROLE_STORAGE_KEY);
    if (storedRole === "student" || storedRole === "technician" || storedRole === "admin") {
      setRoleState(storedRole);
    }
  }, []);

  const setRole = (nextRole: UserRole) => {
    setRoleState(nextRole);
    window.localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
  };

  const value = useMemo(
    () => ({ role, setRole, roleLabel: ROLE_LABELS[role] }),
    [role],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole 必须在 RoleProvider 内使用");
  }
  return context;
}
