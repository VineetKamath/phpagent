import { NextResponse } from "next/server";

export function json(data: unknown, init: { status?: number; maxAge?: number } = {}) {
  return NextResponse.json(data, {
    status: init.status ?? 200,
    headers: {
      "Cache-Control": init.maxAge ? `public, max-age=${init.maxAge}` : "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
