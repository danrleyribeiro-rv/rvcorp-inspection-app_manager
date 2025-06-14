// app/(dashboard)/inspections/components/InspectionAddressForm.js
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function InspectionAddressForm({ address, onAddressChange }) {
  const [cepLoading, setCepLoading] = useState(false);
  const { toast } = useToast();

  const handleCepBlur = async () => {
    const cep = address.cep?.replace(/\D/g, '');
    if (!cep || cep.length !== 8) return;
    
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) {
        throw new Error('Erro ao consultar CEP');
      }
      
      const data = await response.json();
      
      if (!data.erro) {
        onAddressChange({
          ...address,
          street: data.logradouro || address.street,
          neighborhood: data.bairro || address.neighborhood,
          city: data.localidade || address.city,
          state: data.uf || address.state
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "O CEP informado não foi encontrado",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast({
        title: "Erro",
        description: "Não foi possível consultar o CEP",
        variant: "destructive",
      });
    } finally {
      setCepLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">Endereço da Inspeção</h3>
      
      <div className="space-y-2">
        <Label htmlFor="cep">CEP</Label>
        <div className="flex gap-2">
          <Input
            id="cep"
            value={address.cep || ""}
            onChange={(e) => onAddressChange({ ...address, cep: e.target.value })}
            onBlur={handleCepBlur}
            placeholder="00000-000"
          />
          {cepLoading && <Loader2 className="animate-spin h-5 w-5" />}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="street">Rua</Label>
          <Input
            id="street"
            value={address.street || ""}
            onChange={(e) => onAddressChange({ ...address, street: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="number">Número</Label>
          <Input
            id="number"
            value={address.number || ""}
            onChange={(e) => onAddressChange({ ...address, number: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="complement">Complemento</Label>
        <Input
          id="complement"
          value={address.complement || ""}
          onChange={(e) => onAddressChange({ ...address, complement: e.target.value })}
          placeholder="Apto, Bloco, Andar, etc."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="neighborhood">Bairro</Label>
          <Input
            id="neighborhood"
            value={address.neighborhood || ""}
            onChange={(e) => onAddressChange({ ...address, neighborhood: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            value={address.city || ""}
            onChange={(e) => onAddressChange({ ...address, city: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="state">Estado</Label>
        <Input
          id="state"
          value={address.state || ""}
          onChange={(e) => onAddressChange({ ...address, state: e.target.value })}
        />
      </div>
    </div>
  );
}