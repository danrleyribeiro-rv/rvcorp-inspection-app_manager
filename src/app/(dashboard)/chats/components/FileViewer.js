// src/app/(dashboard)/chats/components/FileViewer.jsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export default function FileViewer({ file, isOpen, onClose }) {
  if (!file) return null;
  
  const isImage = file.type === 'image';
  const isVideo = file.type === 'video';
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-4">
        <DialogHeader className="flex justify-between items-center">
          <DialogTitle className="truncate max-w-[500px]">{file.name}</DialogTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(file.url, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex items-center justify-center h-full mt-4">
          {isImage ? (
            <img 
              src={file.url} 
              alt={file.name}
              className="max-h-[70vh] max-w-full object-contain" 
            />
          ) : isVideo ? (
            <video
              src={file.url}
              controls
              className="max-h-[70vh] max-w-full"
            />
          ) : (
            <div className="text-center">
              <p>This file type cannot be previewed.</p>
              <Button 
                className="mt-4"
                onClick={() => window.open(file.url, '_blank')}
              >
                <Download className="mr-2 h-4 w-4" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}