import { NextResponse } from "next/server";

export function GET(request: Request): NextResponse {
  return NextResponse.redirect(new URL("/icon-192.png", request.url), 308);
}
