export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export interface SystemHealthResponse {
  status: "healthy" | "unhealthy" | "degraded";
  service: string;
  timestamp: number;
  django_version?: string;
  components?: {
    database?: {
      status: string;
      engine?: string;
      name?: string;
      error?: string;
    };
    channels?: {
      status: string;
      layer?: string;
      error?: string;
    };
  };
}

export async function fetchBackendHealth(): Promise<SystemHealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/core/health/`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Backend health check failed with status ${response.status}`);
  }
  return response.json();
}
