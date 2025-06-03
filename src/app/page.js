// src/app/page.js
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useLoading } from "@/context/loading-context"; // Import useLoading
import { Loader2 } from "lucide-react";
import { runCodeMigration } from '@/utils/migrateCodes'; // Assuming this export an async function

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { startLoading, finishLoading, updateProgress } = useLoading();
  
  // Refs to track completion of async tasks
  const migrationTaskCompleted = useRef(false);
  const authCheckTaskCompleted = useRef(false);
  // Ref to prevent multiple calls to finishLoading
  const finishingLoader = useRef(false);

  useEffect(() => {
    // Function to attempt finishing the loader if all tasks are done
    const attemptFinishLoading = () => {
      if (migrationTaskCompleted.current && authCheckTaskCompleted.current && !finishingLoader.current) {
        finishingLoader.current = true; // Mark as attempting to finish
        finishLoading();
      }
    };

    startLoading();
    finishingLoader.current = false; // Reset finishing flag on each run (e.g. HMR)
    migrationTaskCompleted.current = false; // Reset task completion flags
    authCheckTaskCompleted.current = false;

    const performMigration = async () => {
      try {
        console.log("Starting code migration...");
        // updateProgress(20); // Optional: indicate some progress
        await runCodeMigration();
        console.log("Code migration finished.");
        // updateProgress(50); // Optional: indicate migration part is done
      } catch (error) {
        console.error("Code migration failed:", error);
        // Optionally handle UI for migration failure
      } finally {
        migrationTaskCompleted.current = true;
        attemptFinishLoading();
      }
    };

    performMigration();

    if (!authLoading) {
      authCheckTaskCompleted.current = true;
      if (user) {
        // Before pushing, ensure loading bar can complete or new page handles it
        // For simplicity, we let attemptFinishLoading handle it.
        // If navigation is too fast, finishLoading might get cut off.
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
      attemptFinishLoading();
    }
    // If authLoading is true, the effect will re-run when it becomes false,
    // then authCheckTaskCompleted will be set to true and attemptFinishLoading called.

    // No specific cleanup for startLoading/finishLoading needed here as
    // the LoadingProvider is global. The bar will complete its cycle.

  }, [user, authLoading, router, startLoading, finishLoading, updateProgress]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <Loader2 className="animate-spin h-12 w-12 text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">
        Preparando sua experiência...
      </p>
    </div>
  );
}