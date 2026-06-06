import api from "../../client";

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  department?: string | null;
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
}

// register
export const register = (data: RegisterData) => {
  return api.post("/auth/register", data);
};

// login
export const login = (email: string, password: string) => {
  return api.post("/auth/login", { email, password });
};

// logout
export const logout = () => {
  return api.post("/auth/logout");
};

// get current user
export const getMe = () => {
  return api.get("/auth/me");
};

// refresh token (backend expects { refresh_token })
export const refresh = (refreshToken: string) => {
  return api.post("/auth/refresh", { refresh_token: refreshToken });
};

// change password
export const changePassword = (data: ChangePasswordData) => {
  return api.put("/auth/change-password", data);
};
