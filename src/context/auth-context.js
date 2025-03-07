// app/context/auth-context.js (with router.refresh())
"use client";

import { createContext, useState, useContext, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const setupAuth = async () => {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log("Auth state changed:", event, session);

          if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
            if (session?.user) {
              setLoading(true); // Start loading during auth check
              console.log("onAuthStateChange: User detected, starting checks...");
              try {
                // Manager Check
                const { data: managerData, error: managerError } =
                  await supabase
                    .from("managers")
                    .select("*")
                    .eq("id", session.user.id)
                    .single();

                if (managerError && managerError.code !== "PGRST116") {
                  console.error("Manager check error:", managerError); // Log the error
                  throw managerError;
                }

                const isManager = managerData !== null;
                const isTestUser = session.user.email === "danrley@post.com";

                console.log("onAuthStateChange: isManager:", isManager);
                console.log("onAuthStateChange: isTestUser:", isTestUser);


                if (isManager || isTestUser) {
                  const newUser = {
                    ...session.user,
                    role: "manager",
                    ...(managerData && { profile: managerData }),
                    ...(isTestUser && { isTestUser: true }),
                  };
                  console.log("onAuthStateChange: Setting user:", newUser);
                  setUser(newUser);

                  if (event === "SIGNED_IN") {
                    console.log("onAuthStateChange: Redirecting to /projects...");
                    router.push("/projects");
                    router.refresh(); // Force a server-side refresh
                    console.log("onAuthStateChange: router.push and router.refresh called."); // Confirm push is called
                  }

                } else {
                  console.log("onAuthStateChange: User is not a manager, logging out...");
                  await supabase.auth.signOut();
                  router.push("/login"); // Redirect on sign out
                  setUser(null);
                }
              } catch (error) {
                console.error("Error in auth check:", error);
                await supabase.auth.signOut();
                router.push("/login");
                setUser(null);
              } finally {
                console.log("onAuthStateChange: Setting loading to false (finally block).");
                setLoading(false);
              }
            } else {
                console.log("onAuthStateChange: No user in session, setting user to null.");
              setUser(null);
              setLoading(false);
            }
          } else if (event === "SIGNED_OUT") {
            console.log("onAuthStateChange: SIGNED_OUT event, setting user to null.");
            setUser(null);
            setLoading(false);
            // No redirect here
          }  else if (event === "PASSWORD_RECOVERY") {
              router.push("/reset-password"); //Navigate user to the reset password page
          } else {
            console.log("onAuthStateChange: Other event, setting loading to false.");
            setLoading(false); // For other events
          }
        }
      );

      return () => {
        authListener.subscription.unsubscribe();
      };
    };

    setupAuth();
  }, [router]);

  const signIn = async (email, password) => {
    console.log("Attempting to login with:", email);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Authentication error:", error);
        setLoading(false);
        throw error;
      }

      console.log("Login successful, data:", data);
      // onAuthStateChange handles the rest

      return { success: true, data };
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false); // Set loading to false on error
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error);
    }
    router.push("/login"); // Redirect on sign out.
  };

    const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Password reset error:", error);
      return { success: false, error: error.message };
    }
  };
  
  // Função para redefinir senha com token
  const resetPasswordWithToken = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
  
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Password reset error:", error);
      return { success: false, error: error.message };
    }
  };

  // Função para atualizar senha
  const updatePassword = async (password) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Password update error:", error);
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        resetPassword,
        resetPasswordWithToken,
        updatePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);