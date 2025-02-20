// src/app/(auth)/forgot-password/page.js
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState({ text: '', success: false });
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', success: false });

    const result = await resetPassword(email);
    if (result.success) {
      setMessage({
        text: 'Password reset email sent. Check your inbox.',
        success: true
      });
    } else {
      setMessage({
        text: 'Error sending reset email. Please try again.',
        success: false
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
          <CardDescription>
          Digite seu endereço de e-mail e enviaremos um link para redefinição de senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {message.text && (
              <Alert variant={message.success ? "default" : "destructive"}>
                <AlertDescription>{message.text}</AlertDescription>
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
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
            </Button>
            <Link 
              href="/login"
              className="flex items-center gap-1 text-sm text-primary hover:underline mt-4 justify-center"
            >
              <ArrowLeft size={16} />
              Retornar ao Login
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}