import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'todo_session'
const SESSION_VALUE = 'authenticated'

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value
  const isLoginPage = request.nextUrl.pathname === '/login'

  if (!session || session !== SESSION_VALUE) {
    if (!isLoginPage) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  if (isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
