const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/dbms/v1";

//  TOKEN HANDLING
function getToken(): string | null {
  return localStorage.getItem("token");
}

function setToken(token: string): void {
  localStorage.setItem("token", token);
}

function clearToken(): void {
  localStorage.removeItem("token");
}

//  GENERIC API RESPONSE (matches backend)
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

//  REQUEST FUNCTION
async function request<TResponse>(
  method: string,
  endpoint: string,
  body?: unknown,
  isFormData: boolean = false,
): Promise<TResponse> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let requestBody: BodyInit | undefined;

  if (body) {
    requestBody = isFormData ? (body as FormData) : JSON.stringify(body);
  }

  const options: RequestInit = {
    method,
    headers,
    body: requestBody,
    // Every response here is dynamic, per-user data — never let the browser
    // serve a stale cached copy of a GET instead of hitting the server.
    cache: "no-store",
  };

  console.log("API Request →", url);

  const res = await fetch(url, options);

  let json: unknown = null;

  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    // Token expired — clear it and send the user back to login
    if (res.status === 401) {
      clearToken();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    const errorMessage =
      typeof json === "object" && json !== null && "error" in json
        ? (json as { error?: string }).error
        : "Request failed";

    console.error("API Error →", json);
    throw new Error(errorMessage || "Request failed");
  }

  // Backend always wraps success as { data: T, error: null }
  const wrapped = json as { data?: TResponse; error: string | null };
  return (wrapped.data ?? json) as TResponse;
}

//  API METHODS
export const api = {
  get: <TResponse>(endpoint: string) => request<TResponse>("GET", endpoint),

  post: <TResponse>(endpoint: string, body?: unknown) =>
    request<TResponse>("POST", endpoint, body),

  put: <TResponse>(endpoint: string, body?: unknown) =>
    request<TResponse>("PUT", endpoint, body),

  patch: <TResponse>(endpoint: string, body?: unknown) =>
    request<TResponse>("PATCH", endpoint, body),

  delete: <TResponse>(endpoint: string) =>
    request<TResponse>("DELETE", endpoint),

  upload: <TResponse>(endpoint: string, formData: FormData) =>
    request<TResponse>("POST", endpoint, formData, true),
};

export const tokenStorage = {
  getAccessToken: () => getToken(),
  setAccessToken: (token: string) => setToken(token),
  clearAccessToken: () => clearToken(),
};

//  AUTH HELPERS
export const auth = {
  getToken,
  setToken,
  clearToken,
};

export { API_BASE_URL };
