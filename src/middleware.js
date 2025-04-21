// src/middleware.js
import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Ignorar caminhos específicos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Tratamento especial para reset de senha
  if (pathname.startsWith('/reset-password')) {
    return NextResponse.next();
  }

  // Rotas públicas que não precisam de autenticação
  const publicPaths = ['/login', '/forgot-password'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Obter o token da sessão dos cookies
  const authToken = request.cookies.get('authToken')?.value;

  // Se não há token e é uma rota protegida, redirecionar para login
  if (!authToken && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Se há token e é uma rota pública (como login), redirecionar para dashboard
  if (authToken && isPublicPath) {
    return NextResponse.redirect(new URL('/projects', request.url));
  }

  // Passar para o próximo middleware ou página
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};