import { NextResponse } from "next/server";

export async function GET() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

  return NextResponse.json({
    status: "healthy",
    service: "movieflow-frontend",
    environment: nodeEnv,
    timestamp: Date.now(),
    config: {
      apiBaseUrl,
      wsBaseUrl,
    },
  });
}
