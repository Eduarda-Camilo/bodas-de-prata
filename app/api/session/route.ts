import { NextRequest, NextResponse } from "next/server";
import { createSession, equal, failure, ApiError } from "@/lib/server";
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (
      !process.env.TRIP_SECRET ||
      !process.env.SESSION_SECRET ||
      !process.env.APP_ORIGIN
    )
      throw new ApiError(
        503,
        "O acesso privado ainda precisa ser configurado.",
      );
    if (!token || !equal(token, process.env.TRIP_SECRET))
      throw new ApiError(
        401,
        "Este link não permite abrir a viagem. Peça à Duda o link privado.",
      );
    const response = NextResponse.redirect(
      new URL("/", process.env.APP_ORIGIN),
      303,
    );
    response.cookies.set("trip_session", createSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 86400,
    });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (e) {
    return failure(e);
  }
}
