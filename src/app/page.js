// src/app/page.js
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/projects');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  // Optional loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return null;
}

// src/middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const isAuth = request.cookies.get('authToken');
  
  // Public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/forgot-password')) {
    if (isAuth) {
      return NextResponse.redirect(new URL('/projects', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes
  if (!isAuth && !pathname.startsWith('/_next')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};