// src/app/page.js (Atualizado)
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Verificar se o usuário está autenticado e redirecionar adequadamente
    if (!loading) {
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  // Estado de carregamento melhorado
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin h-12 w-12 text-primary" />
    </div>
  );
}