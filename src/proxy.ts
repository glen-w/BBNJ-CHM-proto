import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  sandboxBasicAuthorized,
  sandboxBasicBypassPath,
  sandboxBasicConfigured,
  sandboxBasicUnauthorizedResponse,
} from "@/server/sandbox-gate";

/** Hosted-sandbox HTTP Basic gate. Off unless SANDBOX_BASIC_PASSWORD is set. */
export function proxy(request: NextRequest) {
  if (!sandboxBasicConfigured()) return NextResponse.next();
  if (sandboxBasicBypassPath(request.nextUrl.pathname)) return NextResponse.next();
  if (sandboxBasicAuthorized(request.headers.get("authorization"))) return NextResponse.next();
  return sandboxBasicUnauthorizedResponse();
}
