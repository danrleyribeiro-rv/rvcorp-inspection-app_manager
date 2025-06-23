// src/context/auth-context.js
"use client";

import { createContext, useState, useContext, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { showErrorToast } from "@/utils/toast-utils";

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
            const isSecure = window.location.protocol === 'https:';
            document.cookie = `authToken=${token}; path=/; max-age=3600; SameSite=Strict${isSecure ? '; Secure' : ''}`;
            
            // Verificar se usuário é um gerente
            const managerDocRef = doc(db, "managers", firebaseUser.uid);
            const managerDoc = await getDoc(managerDocRef);
            
            if (managerDoc.exists()) {
              const userData = {
                ...firebaseUser,
                role: "manager",
                profile: managerDoc.data(),
              };
              setUser(userData);
              
              // Redirecionar após login bem-sucedido
              if (pathname === '/' || pathname === '/login') {
                router.push('/dashboard');
              }
            } else {
              // Usuário não é um gerente, deslogar
              await firebaseSignOut(auth);
              document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
              router.push("/login");
              setUser(null);
            }
          } catch (error) {
            showErrorToast("Erro de Autenticação", "Erro na verificação de autenticação. Tente fazer login novamente.");
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
  }, [router, pathname]);

  const signIn = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Obter token
      const token = await userCredential.user.getIdToken();
      const isSecure = window.location.protocol === 'https:';
      document.cookie = `authToken=${token}; path=/; max-age=3600; SameSite=Strict${isSecure ? '; Secure' : ''}`;
      
      // Verificar se é gerente
      const managerDocRef = doc(db, "managers", userCredential.user.uid);
      const managerDoc = await getDoc(managerDocRef);
      
      if (managerDoc.exists()) {
        // onAuthStateChanged vai lidar com o redirecionamento
        return { success: true, data: userCredential.user };
      } else {
        // Usuário não é um gerente
        await firebaseSignOut(auth);
        document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        return { success: false, error: "Usuário não autorizado" };
      }
    } catch (error) {
      showErrorToast("Erro de Login", "Não foi possível fazer login. Verifique suas credenciais.");
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      router.push("/login");
    } catch (error) {
      showErrorToast("Erro ao Sair", "Não foi possível sair da conta.");
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
      showErrorToast("Erro ao Redefinir Senha", "Não foi possível enviar o email de redefinição de senha.");
      return { success: false, error: error.message };
    }
  };

  const updateUserPassword = async (currentPassword, newPassword) => {
    try {
      if (!auth.currentUser) {
        throw new Error("Usuário não autenticado");
      }

      // Criar credencial para reautenticação
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );

      // Reautenticar o usuário
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Agora atualizar a senha
      await firebaseUpdatePassword(auth.currentUser, newPassword);

      return { success: true };
    } catch (error) {
      showErrorToast("Erro ao Atualizar Senha", "Não foi possível atualizar a senha. Verifique a senha atual.");
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
        updateUserPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);