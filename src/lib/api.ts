export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

export class ApiError extends Error {\n  constructor(message: string, public status: number) { super(message); }\n}\n\nexport async function apiRequest<T>(
  path: string,
  token?: string,
  init: RequestInit = {},
): Promise<T> {
  if (!API_BASE) throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", "Bearer " + token);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(API_BASE + path, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof payload.detail === "string" ? payload.detail : "API request failed.";
    throw new ApiError(detail, response.status);
  }
  return payload as T;
}
