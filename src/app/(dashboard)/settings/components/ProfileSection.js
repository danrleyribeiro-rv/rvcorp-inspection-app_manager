// src/app/(dashboard)/settings/components/ProfileSection.js
"use client";

import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Upload, Loader2 } from "lucide-react";

export default function ProfileSection() {
  const [profile, setProfile] = useState({
    name: "",
    last_name: "",
    email: "",
    profession: "",
    city: "",
    state: "",
    cep: "",
    street: "",
    neighborhood: "",
    phonenumber: "",
    document: "",
    profileImageUrl: ""
  });
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      if (!user?.uid) return;
      
      const managerRef = doc(db, 'managers', user.uid);
      const managerDoc = await getDoc(managerRef);
      
      if (managerDoc.exists()) {
        const data = managerDoc.data();
        setProfile({
          name: data.name || "",
          last_name: data.last_name || "",
          email: user.email || data.email || "",
          profession: data.profession || "",
          city: data.city || "",
          state: data.state || "",
          cep: data.cep || "",
          street: data.street || "",
          neighborhood: data.neighborhood || "",
          phonenumber: data.phonenumber || "",
          document: data.document || "",
          profileImageUrl: data.profileImageUrl || ""
        });
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar informações do perfil",
        variant: "destructive",
      });
    }
  };

  const handleCepBlur = async () => {
    const cep = profile.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setProfile({
          ...profile,
          street: data.logradouro || profile.street,
          neighborhood: data.bairro || profile.neighborhood,
          city: data.localidade || profile.city,
          state: data.uf || profile.state
        });
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setCepLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Criar preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user?.uid) return;
      
      // Preparar dados para atualização
      const updateData = {
        name: profile.name,
        last_name: profile.last_name,
        profession: profile.profession,
        city: profile.city,
        state: profile.state,
        cep: profile.cep,
        street: profile.street,
        neighborhood: profile.neighborhood,
        phonenumber: profile.phonenumber,
        document: profile.document,
        updated_at: serverTimestamp()
      };
      
      // Upload de imagem, se houver
      if (imageFile) {
        const storageRef = ref(storage, `profile_images/${user.uid}`);
        await uploadBytes(storageRef, imageFile);
        const downloadURL = await getDownloadURL(storageRef);
        updateData.profileImageUrl = downloadURL;
      }
      
      // Atualizar documento no Firestore
      const managerRef = doc(db, 'managers', user.uid);
      await updateDoc(managerRef, updateData);

      // Atualizar o state com a URL da imagem, se foi enviada
      if (imageFile) {
        setProfile({
          ...profile,
          profileImageUrl: updateData.profileImageUrl
        });
      }

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvatarLetters = () => {
    return `${profile.name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Perfil</CardTitle>
        <CardDescription>
          Atualize suas informações pessoais e imagem de perfil
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          {/* Imagem de Perfil */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              {imagePreview ? (
                <AvatarImage src={imagePreview} alt="Preview" />
              ) : profile.profileImageUrl ? (
                <AvatarImage src={profile.profileImageUrl} alt={profile.name} />
              ) : (
                <AvatarFallback>{getAvatarLetters()}</AvatarFallback>
              )}
            </Avatar>
            
            <div className="flex items-center">
              <input
                type="file"
                id="profile-image"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Label
                htmlFor="profile-image"
                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
              >
                <Upload className="h-4 w-4" />
                Alterar Imagem
              </Label>
            </div>
          </div>

          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Sobrenome</Label>
              <Input
                id="last_name"
                value={profile.last_name}
                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              disabled
            />
            <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="profession">Profissão</Label>
            <Input
              id="profession"
              value={profile.profession}
              onChange={(e) => setProfile({ ...profile, profession: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document">Documento (CPF/CNPJ)</Label>
            <Input
              id="document"
              value={profile.document}
              onChange={(e) => setProfile({ ...profile, document: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phonenumber">Telefone</Label>
            <Input
              id="phonenumber"
              value={profile.phonenumber}
              onChange={(e) => setProfile({ ...profile, phonenumber: e.target.value })}
            />
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <div className="flex gap-2">
              <Input
                id="cep"
                value={profile.cep}
                onChange={(e) => setProfile({ ...profile, cep: e.target.value })}
                onBlur={handleCepBlur}
              />
              {cepLoading && <Loader2 className="animate-spin h-5 w-5" />}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="street">Rua</Label>
              <Input
                id="street"
                value={profile.street}
                onChange={(e) => setProfile({ ...profile, street: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input
                id="neighborhood"
                value={profile.neighborhood}
                onChange={(e) => setProfile({ ...profile, neighborhood: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={profile.state}
                onChange={(e) => setProfile({ ...profile, state: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}