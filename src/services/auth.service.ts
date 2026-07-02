import { api, auth } from "./api";

// ===============================
// TYPES
// ===============================
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "viewer";
  department?: string | null;
  avatar_url?: string | null;
  status?: string;
  last_login?: string | null;
  created_at?: string;
  two_factor_enabled?: boolean;
}

export type TwoFactorStatus = "2fa_required" | "2fa_setup_required";

export interface LoginChallengeResponse {
  status: TwoFactorStatus;
  login_challenge: string;
  qr_code?: string;
}

interface LoginVerifyData {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  recovery_codes?: string[];
}

interface RegisterData {
  user: AuthUser;
  login_challenge: string;
  qr_code: string;
  status: TwoFactorStatus;
}

interface MeData {
  user: AuthUser;
}

interface Verify2FAData {
  message: string;
  recovery_codes?: string[];
}

// ===============================
// AUTH SERVICE
// ===============================
export const authService = {
  // Step 1 — password check only. No token is issued; the caller must
  // follow up with loginVerify() using the returned challenge.
  async login(username: string, password: string): Promise<LoginChallengeResponse> {
    return api.post<LoginChallengeResponse>("/auth/login", { username, password });
  },

  // Step 2 — TOTP code or recovery code. Issues tokens on success.
  async loginVerify(loginChallenge: string, code: string): Promise<LoginVerifyData> {
    const data = await api.post<LoginVerifyData>("/auth/login/verify", {
      login_challenge: loginChallenge,
      code,
    });
    auth.setToken(data.accessToken);
    return data;
  },

  // Creates the account and starts mandatory 2FA setup. No token is issued
  // until the caller completes loginVerify() with the returned challenge.
  async register(payload: {
    email: string;
    password: string;
    name: string;
    role?: "admin" | "editor" | "viewer";
    department?: string;
  }): Promise<RegisterData> {
    return api.post<RegisterData>("/auth/register", payload);
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch {
      // best-effort
    } finally {
      auth.clearToken();
    }
  },

  // TOTP/recovery-code based password reset — no email involved.
  async resetPasswordTwoFactor(username: string, code: string, newPassword: string): Promise<void> {
    await api.post("/auth/reset-password", { username, code, new_password: newPassword });
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.put("/auth/change-password", {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },

  async enable2FA(): Promise<{ qr_code: string }> {
    return api.post<{ qr_code: string }>("/auth/2fa/enable");
  },

  // Returns freshly (re)generated recovery codes — show once.
  async verify2FA(code: string): Promise<Verify2FAData> {
    return api.post<Verify2FAData>("/auth/2fa/verify", { code });
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    if (!auth.getToken()) return null;
    try {
      const data = await api.get<MeData>("/auth/me");
      return data.user ?? null;
    } catch {
      auth.clearToken();
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!auth.getToken();
  },
};
