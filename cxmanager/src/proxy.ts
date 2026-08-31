import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const publicRoutes = ["/login"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublicRoute = publicRoutes.includes(pathname);

  if (!isPublicRoute && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isPublicRoute && req.auth) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|ico)$).*)",
  ],
};
