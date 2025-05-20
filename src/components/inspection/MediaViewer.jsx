// components/MediaViewer.js
import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Move } from "lucide-react";

export function MediaViewer({ media, open, onClose, onMove }) {
  const [setShowMoveDialog] = useState(false);
  const mediaRef = useRef(null);

  const handleMove = () => {
    onMove(); // Just call the passed onMove function
    setShowMoveDialog(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose} className="max-w-4xl">
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium">Visualizador de Mídia</h3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleMove}>
              <Move className="mr-2 h-4 w-4" />
              Mover
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50">
          <div 
            ref={mediaRef}
            className="max-h-full"
          >
            {media.type === "image" ? (
              <img
                src={media.url}
                alt="Media"
                className="max-h-[70vh] object-contain"
                draggable="true"
              />
            ) : (
              <video
                src={media.url}
                controls
                className="max-h-[70vh]"
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}