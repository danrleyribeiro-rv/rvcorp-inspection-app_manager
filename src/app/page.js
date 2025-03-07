// app/page.js (Simplified)
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // No need for conditional logic here.  The AuthProvider
    // handles redirection based on the user's status.
    if (!loading && !user) {
      router.push("/login"); //Ensure user is redirected to the login screen if no user is set.
    }
  }, [user, loading, router]);

  // Improved loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
      </div>
    );
  }

  return null; // Render nothing; the redirect will happen.
}