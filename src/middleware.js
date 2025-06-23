// src/middleware.js (Atualizado)
import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Caminhos para ignorar
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Rotas públicas que não precisam de autenticação
  const publicPaths = ['/login', '/forgot-password', '/reset-password'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Autenticação - verificar se há token nos cookies
  const authToken = request.cookies.get('authToken')?.value;
  
  // Debug para desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log('Middleware - Path:', pathname, 'Token present:', !!authToken);
  }

  // Rota raiz (/) - redirecionar para /dashboard ou /login
  if (pathname === '/') {
    if (authToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Se não há token e é uma rota protegida, redirecionar para login
  if (!authToken && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Se há token e é uma rota pública (como login), redirecionar para dashboard
  if (authToken && isPublicPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Passar para o próximo middleware ou página
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};