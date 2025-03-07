// src/middleware.js (with extra logging for debugging)
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request) {
    const { pathname } = request.nextUrl;
    console.log("Middleware running for path:", pathname);


    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name) { 
                    const value = request.cookies.get(name)?.value;
                    console.log(`Getting cookie: ${name} = ${value}`);
                    return value;
                },
                set(name, value, options) {
                    console.log(`Setting cookie: ${name} = ${value}`);
                    request.cookies.set(name, value, options);
                },
                remove(name, options) {
                   console.log(`Removing cookie: ${name}`);
                   request.cookies.delete(name, options);
                },
            }
        }
    );

    const { data: { session } } = await supabase.auth.getSession();
    console.log("Middleware session:", session);


    if (pathname.startsWith('/reset-password')) {
        return NextResponse.next();
    }


    if (pathname.startsWith('/login') || pathname.startsWith('/forgot-password')) {
        if (session) {
            console.log("Middleware: Redirecting authenticated user from login to /projects");
            return NextResponse.redirect(new URL('/projects', request.url));
        }
        return NextResponse.next();
    }


    if (!session && !pathname.startsWith('/_next')) {
        console.log("Middleware: Redirecting unauthenticated user to /login");
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};