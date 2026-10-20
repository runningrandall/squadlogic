import { fetchAuthSession } from "aws-amplify/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function getAuthToken(): Promise<string | undefined> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString();
  } catch {
    return undefined;
  }
}

async function getOrganizationId(): Promise<string | undefined> {
  try {
    const session = await fetchAuthSession();
    // Try access token first, then ID token (custom attrs may only be in ID token)
    return (
      (session.tokens?.accessToken?.payload?.['custom:organizationId'] as string) ||
      (session.tokens?.idToken?.payload?.['custom:organizationId'] as string) ||
      undefined
    );
  } catch {
    return undefined;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const [token, organizationId] = await Promise.all([
    getAuthToken(),
    getOrganizationId(),
  ]);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (organizationId) {
    headers["x-organization-id"] = organizationId;
  }

  return headers;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `Request failed with status ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

async function requestBlob(
  method: string,
  path: string,
  body?: unknown
): Promise<Blob> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `Request failed with status ${response.status}`
    );
  }

  return response.blob();
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  postBlob: (path: string, body: unknown) => requestBlob("POST", path, body),
};
