//src/features/auth/context/AuthProvider/AuthProvider.tsx
import {
  createContext,
  useContext,
  type ReactNode,
  useEffect,
  useMemo,
} from "react";

/* ===========================
   CORE INIT
=========================== */
import { useAuthInit } from "../../hooks/useAuthInit";
import { useTokenDecode } from "../../hooks/useTokenDecode";

/* ===========================
   LOGIN / LOGOUT
=========================== */
import { useLoginHandler } from "../../hooks/useLoginHandler";
import { useLogoutHandler } from "../../hooks/useLogoutHandler";

/* ===========================
   SECURE
=========================== */
import { useSecureRotation } from "../../hooks/useSecureRotation";
import { useSecureCooldown } from "../../hooks/useSecureCooldown";
import { useSecureAccount } from "./useSecureAccount";

/* ===========================
   SESSION MGMT
=========================== */
import { useSessionBootstrap } from "./useSessionBootstrap";
import { useSessionRestore } from "./useSessionRestore";
import { useSessionSocket } from "./useSessionSocket";

/* ===========================
   PASSWORD FLOW
=========================== */
import { usePasswordHandler } from "./usePasswordHandler";

interface AuthProviderProps {
  children: ReactNode;
}

type AuthContextValue = Record<string, any>;

const AuthContext = createContext<AuthContextValue | null>(null);

/* remove nested user + setUser duplicates from hook structs */
const prune = <T extends Record<string, any>>(obj: T): Omit<T, "user" | "setUser"> => {
  if (!obj) return {} as any;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user: _, setUser: __, ...rest } = obj;
  return rest;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  /* -------------------------------------------------
    1) main user + init
  -------------------------------------------------- */
  const { user, setUser, ...authInit } = useAuthInit();

  /* -------------------------------------------------
    2) token decode helpers
  -------------------------------------------------- */
  const tokenTools = useTokenDecode();

  /* -------------------------------------------------
    3) bootstrap session
  -------------------------------------------------- */
  const sessionBootstrap = useSessionBootstrap();
  const { user: bootUser } = sessionBootstrap;

  useEffect(() => {
    if (bootUser) setUser(bootUser);
  }, [bootUser, setUser]);

  /* -------------------------------------------------
    4) auto-restore (visibility / focus)
  -------------------------------------------------- */
  const sessionRestore = useSessionRestore();

  /* -------------------------------------------------
    5) websocket session presence
  -------------------------------------------------- */
  const sessionSocket = useSessionSocket(user, sessionBootstrap.bootstrapped);

  /* -------------------------------------------------
    6) login per-role
  -------------------------------------------------- */
  const studentLogin = useLoginHandler("student", setUser);
  const adminLogin = useLoginHandler("admin", setUser);

  const loginHandlerFactory = (role: "student" | "admin") =>
    role === "student" ? studentLogin : adminLogin;

  /* -------------------------------------------------
    7) logout
  -------------------------------------------------- */
  const logoutTools = useLogoutHandler(setUser);

  /* -------------------------------------------------
    8) secure ops
  -------------------------------------------------- */
  const secureRotation = useSecureRotation();
  const secureCooldown = useSecureCooldown();
  const secureAccount = useSecureAccount(setUser);

  /* -------------------------------------------------
    9) password ops
  -------------------------------------------------- */
  const passwordTools = usePasswordHandler(setUser);

  /* -------------------------------------------------
    FINAL CONTEXT VALUE
  -------------------------------------------------- */
  const value = useMemo<AuthContextValue>(() => {
    return {
      /* -------- core user -------- */
      user,
      setUser,
      role: user?.role || (user as any)?.role,

      /* -------- init + token -------- */
      ...prune(authInit),
      ...prune(tokenTools),

      /* -------- login -------- */
      loginHandlerFactory,
      studentLogin,
      adminLogin,

      /* -------- logout -------- */
      ...prune(logoutTools),

      /* -------- secure account ops -------- */
      ...prune(secureRotation),
      ...prune(secureCooldown),
      ...prune(secureAccount),

      /* -------- session mgmt -------- */
      ...prune(sessionBootstrap),
      ...prune(sessionRestore),
      ...prune(sessionSocket),

      /* -------- password ops -------- */
      ...prune(passwordTools),
    };
  }, [
    user,
    setUser,
    authInit,
    tokenTools,
    studentLogin,
    adminLogin,
    logoutTools,
    secureRotation,
    secureCooldown,
    secureAccount,
    sessionBootstrap,
    sessionRestore,
    sessionSocket,
    passwordTools,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
};
