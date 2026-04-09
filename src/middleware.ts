import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const AUTH_PAGES = ["/login", "/signup"];

function redirectPreservingSessionCookies(
  sessionResponse: NextResponse,
  url: URL,
): NextResponse {
  const redirect = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });
  return redirect;
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  if (path.startsWith("/dashboard") && !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return redirectPreservingSessionCookies(response, login);
  }

  if (AUTH_PAGES.some((p) => path === p || path.startsWith(`${p}/`)) && user) {
    return redirectPreservingSessionCookies(
      response,
      new URL("/dashboard", request.url),
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
