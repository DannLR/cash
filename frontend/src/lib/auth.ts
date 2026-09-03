import { apiGet, apiPost } from "@/lib/api";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OwnerUser {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  user: OwnerUser;
}

export interface AuthMessageResponse {
  message: string;
}

export const login = (payload: LoginRequest) => apiPost<LoginResponse>("/auth/login", payload);
export const getCurrentUser = () => apiGet<OwnerUser>("/auth/me");
export const logout = () => apiPost<AuthMessageResponse>("/auth/logout");