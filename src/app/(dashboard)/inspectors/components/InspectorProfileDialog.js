// app/(dashboard)/inspectors/components/InspectorProfileDialog.js
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MapPin, 
  Building, 
  Phone, 
  Mail, 
  Calendar, 
  Star,
  User,
  Briefcase,
  GraduationCap
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function InspectorProfileDialog({ inspector, open, onClose }) {
  if (!inspector) return null;

  const getAvatarLetters = () => {
    const name = inspector.name || '';
    const lastName = inspector.last_name || '';
    return `${name.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getProfileImageUrl = () => {
    // Primeiro tenta profileImageUrl (campo direto)
    if (inspector.profileImageUrl) {
      return inspector.profileImageUrl;
    }
    // Fallback para profile_images array (se existir)
    if (inspector.profile_images && inspector.profile_images.length > 0) {
      return inspector.profile_images[0].url;
    }
    return null;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return null;
    try {
      const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
      return format(date, "PPP", { locale: ptBR });
    } catch (error) {
      console.error("Error formatting date:", error);
      return null;
    }
  };

  const getRatingStars = (rating) => {
    const numericRating = parseFloat(rating) || 0;
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= numericRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      );
    }
    
    return (
      <div className="flex items-center gap-2">
        <div className="flex">{stars}</div>
        <span className="text-sm font-medium">{numericRating.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground">
          ({inspector.rating_count || 0} avaliações)
        </span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Perfil do Vistoriador</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header com foto e info básica */}
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={getProfileImageUrl()} />
              <AvatarFallback className="text-xl">{getAvatarLetters()}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2">
              <div>
                <h3 className="text-xl font-semibold">
                  {inspector.name} {inspector.last_name || ''}
                </h3>
                {inspector.profession && (
                  <p className="text-muted-foreground">{inspector.profession}</p>
                )}
              </div>
              
              {/* Rating */}
              {inspector.rating && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Avaliação</p>
                  {getRatingStars(inspector.rating)}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Informações de contato */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Informações de Contato
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {inspector.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{inspector.email}</span>
                </div>
              )}
              
              {inspector.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{inspector.phone}</span>
                </div>
              )}
              
              {inspector.city && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{inspector.city}</span>
                </div>
              )}
              
              {inspector.state && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{inspector.state}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Informações profissionais */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Informações Profissionais
            </h4>
            
            {inspector.profession && (
              <div>
                <p className="text-sm text-muted-foreground">Profissão</p>
                <p className="font-medium">{inspector.profession}</p>
              </div>
            )}

            {inspector.experience_years && (
              <div>
                <p className="text-sm text-muted-foreground">Experiência</p>
                <p className="font-medium">{inspector.experience_years} anos</p>
              </div>
            )}

            {inspector.license_number && (
              <div>
                <p className="text-sm text-muted-foreground">Número da Licença</p>
                <p className="font-medium">{inspector.license_number}</p>
              </div>
            )}
          </div>

          {/* Especializações/Treinamentos */}
          {inspector.training && inspector.training.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Especializações
                </h4>
                
                <div className="flex flex-wrap gap-2">
                  {inspector.training.map((training, index) => (
                    <Badge key={index} variant="secondary">
                      {training}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Datas importantes */}
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Informações do Sistema
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {inspector.created_at && (
                <div>
                  <p className="text-muted-foreground">Cadastrado em</p>
                  <p className="font-medium">{formatDate(inspector.created_at)}</p>
                </div>
              )}
              
              {inspector.last_login && (
                <div>
                  <p className="text-muted-foreground">Último acesso</p>
                  <p className="font-medium">{formatDate(inspector.last_login)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Biografia/Observações */}
          {inspector.bio && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium">Sobre</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {inspector.bio}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}