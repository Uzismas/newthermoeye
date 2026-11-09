import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  addAudit,
  apiError,
  getConsoleState,
  noStoreHeaders,
  sessionCookieName,
  sessionCookieValue,
} from "@/features/clinical-console/server/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessionCookie = (await cookies()).get(sessionCookieName);

  if (sessionCookie?.value !== sessionCookieValue) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Clinical console session is not active." },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  return NextResponse.json({ user: getConsoleState().sessionUser }, { headers: noStoreHeaders() });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")
    ? await readFormBody(request)
    : ((await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null);

  if (typeof body?.email !== "string" || typeof body.password !== "string") {
    return apiError("BAD_REQUEST", "Email and password are required.", 400);
  }

  const credentials = [
    {
      email: process.env.THERMOEYE_DEMO_EMAIL ?? "doctor@thermoeye.demo",
      password: process.env.THERMOEYE_DEMO_PASSWORD ?? "pilot-access",
    },
    { email: "doctor@hospital.th", password: "demo" },
  ];
  const requestedEmail = body.email.trim().toLowerCase();
  const hasValidCredential = credentials.some(
    (credential) => requestedEmail === credential.email && body.password === credential.password,
  );

  if (!hasValidCredential) {
    return apiError("UNAUTHORIZED", "Invalid clinical console credentials.", 401);
  }

  const { sessionUser } = getConsoleState();
  addAudit(`${sessionUser.name} signed in as ${sessionUser.role}`);

  // Keep the login form usable if client-side hydration is delayed or fails.
  // JavaScript fetches still receive the JSON response below.
  const acceptsHtml = request.headers.get("accept")?.includes("text/html");
  if (acceptsHtml) {
    const response = NextResponse.redirect(new URL("/console/dashboard", request.url));
    response.cookies.set(sessionCookieName, sessionCookieValue, {
      httpOnly: true,
      maxAge: 60 * 60 * 8,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }

  const response = NextResponse.json({ user: sessionUser }, { headers: noStoreHeaders() });
  response.cookies.set(sessionCookieName, sessionCookieValue, {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

async function readFormBody(request: Request) {
  const form = await request.formData().catch(() => null);
  return form
    ? { email: form.get("email"), password: form.get("password") }
    : null;
}

export function DELETE() {
  const { sessionUser } = getConsoleState();
  addAudit(`${sessionUser.name} signed out`);

  const response = NextResponse.json({ ok: true }, { headers: noStoreHeaders() });
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
