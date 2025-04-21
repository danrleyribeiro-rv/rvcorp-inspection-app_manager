// src/context/auth-context.js
"use client";

import { createContext, useState, useContext, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const setupAuth = async () => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            // Check if user is a manager
            const managerDocRef = doc(db, "managers", firebaseUser.uid);
            const managerDoc = await getDoc(managerDocRef);
            
            if (managerDoc.exists() || firebaseUser.email === "danrley@post.com") {
              const userData = {
                ...firebaseUser,
                role: "manager",
                ...(managerDoc.exists() && { profile: managerDoc.data() }),
                ...(firebaseUser.email === "danrley@post.com" && { isTestUser: true }),
              };
              setUser(userData);
            } else {
              // User is not a manager, sign them out
              await firebaseSignOut(auth);
              router.push("/login");
              setUser(null);
            }
          } catch (error) {
            console.error("Error in auth check:", error);
            await firebaseSignOut(auth);
            router.push("/login");
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    };

    setupAuth();
  }, [router]);

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Firebase handles the session automatically
      router.push("/projects");
      router.refresh();
      
      return { success: true, data: userCredential.user };
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true,
      });
      return { success: true };
    } catch (error) {
      console.error("Password reset error:", error);
      return { success: false, error: error.message };
    }
  };

  const resetPasswordWithToken = async (newPassword) => {
    try {
      // In Firebase, the auth session should already be tied to the reset token
      // when the user clicks the reset link in their email
      await firebaseUpdatePassword(auth.currentUser, newPassword);
      return { success: true };
    } catch (error) {
      console.error("Password reset error:", error);
      return { success: false, error: error.message };
    }
  };

  const updatePassword = async (password) => {
    try {
      await firebaseUpdatePassword(auth.currentUser, password);
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