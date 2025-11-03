import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken')?.value;

  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/dashboard') && !accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirected', 'true');
    return NextResponse.redirect(loginUrl);
  }
  if (accessToken && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Nếu không rơi vào các trường hợp trên, cho phép request tiếp tục bình thường.
  return NextResponse.next();
}

// Config: Chỉ định middleware này chỉ nên chạy trên các route nào.
// Điều này giúp tối ưu, tránh chạy logic trên các request không cần thiết (như file ảnh, css).
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}