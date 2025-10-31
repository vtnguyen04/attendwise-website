import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Hàm này sẽ được gọi cho MỌI request đến server.
export function middleware(request: NextRequest) {
  // 1. Lấy token từ cookie của request
  // Chúng ta sẽ dùng cookie thay vì localStorage vì middleware chạy trên server, không có quyền truy cập localStorage.
  const accessToken = request.cookies.get('accessToken')?.value;

  // 2. Lấy URL người dùng đang cố gắng truy cập
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/dashboard') && !accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirected', 'true');
    return NextResponse.redirect(loginUrl);
  }

  // 4. Logic cho người đã đăng nhập:
  // Nếu người dùng đã đăng nhập (có accessToken) và họ đang cố vào trang /login hoặc /register
  // thì chuyển hướng họ vào dashboard.
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