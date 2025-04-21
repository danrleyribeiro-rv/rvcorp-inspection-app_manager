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
            // Obter token ID para uso com cookies
            const token = await firebaseUser.getIdToken();
            
            // Armazenar o token no cookie (client-side)
            document.cookie = `authToken=${token}; path=/; max-age=3600; SameSite=Strict; Secure`;
            
            // Verificar se usuário é um gerente
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
              // Usuário não é um gerente, deslogar
              await firebaseSignOut(auth);
              document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
              router.push("/login");
              setUser(null);
            }
          } catch (error) {
            console.error("Erro na verificação de autenticação:", error);
            await firebaseSignOut(auth);
            document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
            router.push("/login");
            setUser(null);
          }
        } else {
          // Limpar cookie e estado do usuário
          document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
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
      
      // Firebase gerencia a sessão automaticamente
      router.push("/projects");
      
      return { success: true, data: userCredential.user };
    } catch (error) {
      console.error("Erro de login:", error);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      router.push("/login");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  // Resto do código permanece o mesmo...
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true,
      });
      return { success: true };
    } catch (error) {
      console.error("Erro de redefinição de senha:", error);
      return { success: false, error: error.message };
    }
  };

  // Resto das funções...

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        resetPassword,
        // Outras funções...
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);