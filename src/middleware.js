// src/middleware.js
import { NextResponse } from 'next/server';
import { getAuth, onIdTokenChanged } from 'firebase/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if it hasn't been initialized
const initializeAdminApp = () => {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getAdminAuth();
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip middleware for certain paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Special handling for reset password
  if (pathname.startsWith('/reset-password')) {
    return NextResponse.next();
  }

  // Get the Firebase token from cookies
  const session = request.cookies.get('session')?.value;

  // No session, redirect to login unless already on login/forgot-password
  if (!session) {
    if (pathname.startsWith('/login') || pathname.startsWith('/forgot-password')) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify the session
  try {
    const adminAuth = initializeAdminApp();
    const decodedToken = await adminAuth.verifySessionCookie(session, true);

    // User is authenticated
    if (decodedToken) {
      if (pathname.startsWith('/login') || pathname.startsWith('/forgot-password')) {
        return NextResponse.redirect(new URL('/projects', request.url));
      }
      return NextResponse.next();
    }
  } catch (error) {
    // Session is invalid or expired
    console.error('Error verifying session:', error);
    
    // Clear invalid session cookie
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session');
    return response;
  }

  // Fallback
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};