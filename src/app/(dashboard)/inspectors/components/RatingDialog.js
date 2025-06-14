// app/(dashboard)/inspectors/components/RatingDialog.js
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { useAuth } from "@/context/auth-context";

const RATING_CATEGORIES = [
  {
    key: 'quality',
    label: 'Qualidade dos Registros',
    description: 'Precisão e detalhamento das imagens/videos registrados'
  },
  {
    key: 'detail',
    label: 'Detalhamento',
    description: 'Nível de detalhes nas observações e evidências'
  },
  {
    key: 'communication',
    label: 'Comunicação',
    description: 'Clareza e efetividade na comunicação'
  },
  {
    key: 'availability',
    label: 'Disponibilidade',
    description: 'Pontualidade e disponibilidade para o trabalho'
  }
];

export default function RatingDialog({ inspector, open, onClose, onRate }) {
  const [ratings, setRatings] = useState({
    quality: 0,
    detail: 0,
    communication: 0,
    availability: 0
  });
  const [comment, setComment] = useState("");
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Calcula a média geral em tempo real
  const calculateOverallRating = () => {
    const filledRatings = Object.values(ratings).filter(rating => rating > 0);
    if (filledRatings.length === 0) return 0;
    
    const sum = filledRatings.reduce((acc, rating) => acc + rating, 0);
    return (sum / filledRatings.length).toFixed(1);
  };

  const overallRating = calculateOverallRating();

  const handleSubmit = async () => {
    const filledRatings = Object.values(ratings).filter(rating => rating > 0);
    
    if (filledRatings.length === 0) {
      return;
    }

    setLoading(true);
    try {
      const ratingData = {
        overall_rating: parseFloat(overallRating),
        categories: ratings,
        comment,
        manager_id: user?.uid,
        manager_name: user?.displayName || user?.email,
        created_at: new Date().toISOString()
      };

      await onRate(inspector, ratingData);
      
      // Reset form
      setRatings({
        quality: 0,
        detail: 0,
        communication: 0,
        availability: 0
      });
      setComment("");
      onClose();
    } catch (error) {
      console.error("Error submitting rating:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateRating = (category, value) => {
    setRatings(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const StarRating = ({ category, currentRating }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            onClick={() => updateRating(category, value)}
            onMouseEnter={() => {
              setHoveredCategory(category);
              setHoveredRating(value);
            }}
            onMouseLeave={() => {
              setHoveredCategory(null);
              setHoveredRating(0);
            }}
            className="focus:outline-none transition-transform hover:scale-110"
            type="button"
          >
            <Star
              className={`h-6 w-6 ${
                value <= (hoveredCategory === category ? hoveredRating : currentRating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const OverallRatingDisplay = () => {
    const rating = parseFloat(overallRating);
    
    return (
      <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((value) => (
            <Star
              key={value}
              className={`h-8 w-8 ${
                value <= rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          ))}
        </div>
        <div>
          <div className="text-2xl font-bold text-primary">
            {rating > 0 ? rating : "0.0"}
          </div>
          <div className="text-sm text-muted-foreground">
            Avaliação Geral
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avaliar Lincer</DialogTitle>
          <DialogDescription>
            Avalie o desempenho do lincer {inspector.name} nas categorias abaixo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avaliação Geral - Calculada */}
          <OverallRatingDisplay />

          {/* Categorias de Avaliação */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Categorias de Avaliação</Label>
            
            {RATING_CATEGORIES.map((category) => (
              <div key={category.key} className="space-y-1 p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{category.label}</h4>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <StarRating 
                      category={category.key} 
                      currentRating={ratings[category.key]} 
                    />
                    <span className="text-sm font-medium w-8">
                      {ratings[category.key] > 0 ? ratings[category.key] : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comentário */}
          <div className="space-y-1">
            <Label>Comentários e Observações</Label>
            <Textarea
              placeholder="Deixe comentários detalhados sobre o desempenho do lincer..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Informações do Avaliador */}
          <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded">
            <p>Avaliação realizada por: {user?.displayName || user?.email}</p>
            <p>Data: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={parseFloat(overallRating) === 0 || loading}
            >
              {loading ? "Enviando..." : "Enviar Avaliação"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}