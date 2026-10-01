import { NextRequest, NextResponse } from "next/server";
import { hasSession } from "@/lib/server";
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (
    request.nextUrl.pathname === "/" &&
    (!process.env.TRIP_SECRET || (await hasSession()))
  )
    response.headers.set("X-Trip-Shell", "1");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/"] };
