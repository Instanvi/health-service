// lib/api.ts  (or utils/api.ts — put this anywhere you like)
import Cookies from "js-cookie";
import { useMutation, UseMutationOptions } from "@tanstack/react-query";

export const BASE_URL = 'https://api/dappahealth.online/dappa'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Reusable authenticated fetch with global 401 handling
async function apiFetch<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const token = Cookies.get("authToken");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Merge any existing headers from init
  if (init?.headers) {
    Object.assign(headers, init.headers);
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${input}`, {
    ...init,
    headers,
    credentials: "include", // optional, remove if not using httpOnly cookies
  });

  // Global 401 handling: clear auth and redirect
  if (response.status === 401) {
    Cookies.remove("authToken");
    localStorage.clear();
    window.location.href = "/sign-in";
    // Prevent further execution
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    let errorMessage = "Something went wrong";
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = `HTTP ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) return null as T;

  return response.json();
}

// POST helper
const post = <T>(url: string, body: any) =>
  apiFetch<T>(url, {
    method: "POST",
    body: JSON.stringify(body),
  });

// GET helper (add more as needed: put, del, etc.)
const get = <T>(url: string, config?: RequestInit) =>
  apiFetch<T>(url, { method: "GET", ...config });

// PUT helper
const put = <T>(url: string, body: any) =>
  apiFetch<T>(url, {
    method: "PUT",
    body: JSON.stringify(body),
  });

// DELETE helper
const del = <T>(url: string, config?: { data?: any }) =>
  apiFetch<T>(url, {
    method: "DELETE",
    body: config?.data ? JSON.stringify(config.data) : undefined,
  });

// =============================================
// Login Validation Hook (exact same behavior as before)
// =============================================

interface LoginPayload {
  username: string;
  password: string;
  otp: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: any;
}

async function validateLogin({ username, password, otp }: LoginPayload) {
  const data = await post<LoginResponse>(`/auth/login/validate?otp=${otp}`, {
    username,
    password,
  });

  // Save new token if returned
  if (data.accessToken) {
    Cookies.set("authToken", data.accessToken, { expires: 7 });
  }

  return data;
}

// Export the hook
export function useValidateLogin(
  options?: UseMutationOptions<LoginResponse, Error, LoginPayload>
) {
  return useMutation<LoginResponse, Error, LoginPayload>({
    mutationFn: validateLogin,
    ...options,
  });
}

// Create axios-like API client interface
const apiClient = {
  post,
  get,
  put,
  delete: del,
};

// Export as default for convenience
export default apiClient;

// Optional: Export raw helpers if needed elsewhere
export { apiFetch, post, get, put, del };