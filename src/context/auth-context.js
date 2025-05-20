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
import { useRouter, usePathname } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

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
              
              // Adicione este trecho para melhorar a navegação
              if (!loading) {
                // Se estamos em '/' e autenticados, redirecionar para /projects
                if (pathname === '/') {
                  router.push('/projects');
                }
              }
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
          
          // Se não estamos em uma rota pública e não há usuário, redirecionar para login
          const publicPaths = ['/login', '/forgot-password', '/reset-password'];
          const isPublicPath = publicPaths.some(path => pathname?.startsWith(path));
          
          if (!isPublicPath && !loading) {
            router.push('/login');
          }
        }
        setLoading(false);
      });

      return () => unsubscribe();
    };

    setupAuth();
  }, [router, pathname]); // Adicione pathname às dependências

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Obter token
      const token = await userCredential.user.getIdToken();
      document.cookie = `authToken=${token}; path=/; max-age=3600; SameSite=Strict; Secure`;
      
      // Verificar se é gerente
      const managerDocRef = doc(db, "managers", userCredential.user.uid);
      const managerDoc = await getDoc(managerDocRef);
      
      if (managerDoc.exists() || userCredential.user.email === "danrley@post.com") {
        // Definir usuário no state
        const userData = {
          ...userCredential.user,
          role: "manager",
          ...(managerDoc.exists() && { profile: managerDoc.data() }),
          ...(userCredential.user.email === "danrley@post.com" && { isTestUser: true }),
        };
        
        setUser(userData);
        
        // Esperar que o estado seja atualizado antes de redirecionar
        setTimeout(() => {
          router.push("/projects");
          setLoading(false);
        }, 100);
        
        return { success: true, data: userCredential.user };
      } else {
        // Usuário não é um gerente
        await firebaseSignOut(auth);
        document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        router.push("/login");
        setUser(null);
        setLoading(false);
        return { success: false, error: "Usuário não autorizado" };
      }
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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);