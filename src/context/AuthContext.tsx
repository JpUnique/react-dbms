import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";

import { authService, AuthUser, TwoFactorStatus } from "@/services/auth.service";

export interface PendingChallenge {
  challenge: string;
  status: TwoFactorStatus;
  qrCode?: string;
}

type StepResult =
  | { ok: true; status: TwoFactorStatus }
  | { ok: false; error: string };

type VerifyResult =
  | { ok: true; recoveryCodes?: string[] }
  | { ok: false; error: string };

interface AuthContextType {
  currentUser: AuthUser | null;
  isLoading: boolean;
  // Set once login()/register() succeed at the password/account-creation
  // step — holds the short-lived challenge until completeChallenge() (or a
  // fresh login attempt) resolves it. Intentionally in-memory only (not
  // localStorage): a page refresh mid-setup should safely drop back to
  // /login rather than persist a half-authenticated state.
  pendingChallenge: PendingChallenge | null;
  login: (username: string, password: string) => Promise<StepResult>;
  register: (name: string, email: string, password: string) => Promise<StepResult>;
  completeChallenge: (code: string) => Promise<VerifyResult>;
  clearChallenge: () => void;
  logout: () => Promise<void>;
  updateUserProfile: (user: Partial<AuthUser>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingChallenge, setPendingChallenge] = useState<PendingChallenge | null>(null);

  // INIT
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error("Auth init error:", error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // LOGIN (step 1 — password check)
  const login = useCallback(
    async (username: string, password: string): Promise<StepResult> => {
      setIsLoading(true);
      try {
        const res = await authService.login(username, password);
        setPendingChallenge({
          challenge: res.login_challenge,
          status: res.status,
          qrCode: res.qr_code,
        });
        return { ok: true, status: res.status };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Login failed" };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // REGISTER (creates account, starts mandatory 2FA setup)
  const register = useCallback(
    async (name: string, email: string, password: string): Promise<StepResult> => {
      setIsLoading(true);
      try {
        const res = await authService.register({ name, email, password });
        setPendingChallenge({
          challenge: res.login_challenge,
          status: res.status,
          qrCode: res.qr_code,
        });
        return { ok: true, status: res.status };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Registration failed" };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // LOGIN VERIFY (step 2 — code check, issues tokens)
  const completeChallenge = useCallback(
    async (code: string): Promise<VerifyResult> => {
      if (!pendingChallenge) {
        return { ok: false, error: "Your session expired — please sign in again." };
      }
      setIsLoading(true);
      try {
        const data = await authService.loginVerify(pendingChallenge.challenge, code);
        setCurrentUser(data.user);
        setPendingChallenge(null);
        return { ok: true, recoveryCodes: data.recovery_codes };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Invalid code" };
      } finally {
        setIsLoading(false);
      }
    },
    [pendingChallenge],
  );

  const clearChallenge = useCallback(() => setPendingChallenge(null), []);

  // LOGOUT
  const logout = useCallback(async () => {
    await authService.logout();
    setCurrentUser(null);
    setPendingChallenge(null);
  }, []);

  // UPDATE PROFILE (UI only)
  const updateUserProfile = useCallback(
    async (userData: Partial<AuthUser>): Promise<boolean> => {
      if (!currentUser) return false;

      setCurrentUser((prev) => (prev ? { ...prev, ...userData } : prev));

      return true;
    },
    [currentUser],
  );

  const value = useMemo(
    () => ({
      currentUser,
      isLoading,
      pendingChallenge,
      login,
      register,
      completeChallenge,
      clearChallenge,
      logout,
      updateUserProfile,
    }),
    [currentUser, isLoading, pendingChallenge, login, register, completeChallenge, clearChallenge, logout, updateUserProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
