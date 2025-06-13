// app/(dashboard)/templates/components/ItemDetailEditor.js
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";

const RESPONSE_TYPES = [
  { value: "text", label: "Texto" },
  { value: "select", label: "Seleção" },
  { value: "number", label: "Número" },
  { value: "boolean", label: "Sim/Não" },
  { value: "image", label: "Imagem" },
  { value: "video", label: "Vídeo" },
  { value: "measure", label: "Medida" }
];

export default function ItemDetailEditor({ details = [], onChange }) {
  const addDetail = () => {
    onChange([...details, {
      name: "",
      type: "text",
      required: false,
      options: [],
      media_requirements: {
        images: { min: 0, max: 1 },
        videos: { min: 0, max: 1 }
      }
    }]);
  };

  const updateDetail = (index, field, value) => {
    const newDetails = [...details];
    if (field.includes('.')) {
      const [main, sub, prop] = field.split('.');
      newDetails[index][main] = newDetails[index][main] || {};
      newDetails[index][main][sub] = newDetails[index][main][sub] || {};
      const numberValue = Number(value);
      newDetails[index][main][sub][prop] = isNaN(numberValue) ? 0 : numberValue;
    } else {
      newDetails[index][field] = value;
    }
    onChange(newDetails);
  };

  const removeDetail = (index) => {
    onChange(details.filter((_, i) => i !== index));
  };

  const updateOptions = (index, optionsString) => {
    const newDetails = [...details];
    // Store raw text in detail
    newDetails[index].optionsText = optionsString;
    // Process options only when there's text
    if (optionsString.trim()) {
      newDetails[index].options = optionsString
        .split(",")
        .map(option => option.trim())
        .filter(Boolean);
    } else {
      newDetails[index].options = [];
    }
    onChange(newDetails);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label>Detalhes do Item</Label>
        <Button variant="outline" onClick={addDetail} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Detalhe
        </Button>
      </div>

      {details.length === 0 ? (
        <div className="text-center py-4 border border-dashed rounded-lg">
          <p className="text-muted-foreground text-sm">Ainda não há detalhes definidos</p>
          <Button onClick={addDetail} variant="ghost" size="sm" className="mt-1">
            <Plus className="mr-2 h-3 w-3" />
            Adicionar primeiro detalhe
          </Button>
        </div>
      ) : (
        <div className="max-h-48 overflow-auto">
          {details.map((detail, index) => (
            <Card key={index} className="mb-2 border">
              <CardContent className="p-2 space-y-2">
                <div className="flex justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-sm">Nome do Detalhe</Label>
                    <Input
                      value={detail.name}
                      onChange={e => updateDetail(index, "name", e.target.value)}
                      placeholder="Ex: Condição, Estado, Medidas..."
                      className="h-7 text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeDetail(index)}
                    title="Remover Detalhe"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de Resposta</Label>
                    <Select
                      value={detail.type}
                      onValueChange={value => updateDetail(index, "type", value)}
                    >
                      <SelectTrigger className="h-7 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESPONSE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <Label className="text-xs">Campo Obrigatório</Label>
                    <Switch
                      checked={detail.required}
                      onCheckedChange={checked => updateDetail(index, "required", checked)}
                      className="h-4 w-8"
                    />
                  </div>
                </div>

                {detail.type === "select" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Opções (separadas por vírgula)</Label>
                    <Input
                      value={detail.optionsText || detail.options?.join(", ") || ""}
                      onChange={e => updateOptions(index, e.target.value)}
                      placeholder="Opção 1, Opção 2, Opção 3..."
                      className="h-7 text-sm"
                    />
                  </div>
                )}

                {(detail.type === "image" || detail.type === "video") && (
                  <div className="space-y-2">
                    <Label className="text-xs">Requisitos de {detail.type === "image" ? "Imagens" : "Vídeos"}</Label>
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <Label className="text-xs">Mínimo</Label>
                        <Input
                          type="number"
                          min="0"            
                          value={detail.media_requirements?.[detail.type === "image" ? "images" : "videos"]?.min || 0}
                          onChange={e => updateDetail(index, `media_requirements.${detail.type === "image" ? "images" : "videos"}.min`, e.target.value)}
                          className="h-7 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Máximo</Label>
                        <Input
                          type="number"
                          min="0"
                          value={detail.media_requirements?.[detail.type === "image" ? "images" : "videos"]?.max || 0}
                          onChange={e => updateDetail(index, `media_requirements.${detail.type === "image" ? "images" : "videos"}.max`, e.target.value)}
                          className="h-7 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}