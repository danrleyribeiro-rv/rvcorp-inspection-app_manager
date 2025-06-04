// app/(dashboard)/inspectors/components/InspectorCard.js
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Building, User, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";

export default function InspectorCard({ inspector, onRate, onViewProfile }) {
  const [userRating, setUserRating] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    // Busca a avaliação do usuário atual
    if (inspector.detailed_ratings && user?.uid) {
      const myRating = inspector.detailed_ratings.find(
        rating => rating.manager_id === user.uid
      );
      setUserRating(myRating);
    }
  }, [inspector.detailed_ratings, user]);

  const getAvatarLetters = () => {
    const name = inspector.name || '';
    const lastName = inspector.last_name || '';
    return `${name.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getProfileImageUrl = () => {
    if (inspector.profileImageUrl) {
      return inspector.profileImageUrl;
    }
    if (inspector.profile_images && inspector.profile_images.length > 0) {
      return inspector.profile_images[0].url;
    }
    return null;
  };

  const RatingDisplay = () => {
    const overallRating = parseFloat(inspector.rating || 0);
    const totalRatings = inspector.rating_count || 0;

    return (
      <div className="space-y-2">
        {/* Avaliação Geral */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{overallRating.toFixed(1)}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            ({totalRatings} avaliações)
          </span>
        </div>

        {/* Minha Avaliação */}
        {userRating && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Minha avaliação: {userRating.overall_rating}
            </Badge>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={getProfileImageUrl()} />
            <AvatarFallback className="text-lg">{getAvatarLetters()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">
              {inspector.name} {inspector.last_name || ''}
            </CardTitle>
            <RatingDisplay />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="space-y-2">
            {inspector.city && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{inspector.city}</span>
              </div>
            )}
            {inspector.state && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building className="h-4 w-4" />
                <span>{inspector.state}</span>
              </div>
            )}
          </div>

          {inspector.profession && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Profissão:</span> {inspector.profession}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {Array.isArray(inspector.training) && inspector.training.map((specialty) => (
              <span
                key={specialty}
                className="px-2 py-1 bg-primary/10 rounded-full text-xs"
              >
                {specialty}
              </span>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={onViewProfile} variant="outline" className="flex-1">
              <Eye className="mr-2 h-4 w-4" />
              Ver Perfil
            </Button>
            <Button onClick={onRate} variant="outline" className="flex-1">
              <Star className="mr-2 h-4 w-4" />
              {userRating ? "Reavaliação" : "Avaliar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}