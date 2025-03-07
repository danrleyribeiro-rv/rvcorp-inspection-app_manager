// app/(auth)/login/page.js  (Minor change: more robust error message)
"use client";

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn(email, password);
    if (!result.success) {
      // More robust error handling, including Supabase-specific errors
      if (result.error.includes("Invalid login credentials")) {
        setError('Email ou senha incorretos. Por favor, verifique suas credenciais.');
      } else if (result.error.includes("Unauthorized access")) {
        setError('Você não tem permissão para acessar este sistema. Apenas gerentes podem acessar.');
      } else {
        setError(result.error || 'Ocorreu um erro durante o login.');
      }
      setLoading(false); // Ensure loading is set to false on error
    }
    // No need to set loading to false if successful; onAuthStateChange will handle redirect
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-32 h-32 relative mb-4">
            <Image
              src="/logo.png"
              alt="RV Corp Logo"
              fill
              className="object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Login do Gerente</CardTitle>
          <CardDescription>Insira suas credenciais para acessar sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline flex items-center gap-1 justify-center"
                >
                Esqueci a minha senha
                <ArrowRight size={16} />
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}