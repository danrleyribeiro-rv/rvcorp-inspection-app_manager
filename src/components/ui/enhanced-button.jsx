// src/components/ui/enhanced-button.jsx
"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { Spinner } from "./loading";

const getButtonVariants = (variant = "default", size = "default") => {
  const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden select-none touch-manipulation";
  
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 hover:shadow-md active:scale-[0.96] active:shadow-sm",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/95 hover:shadow-md active:scale-[0.96] active:shadow-sm",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 active:scale-[0.96] active:shadow-sm",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/90 hover:shadow-sm active:scale-[0.96] active:shadow-inner",
    ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80 active:scale-[0.94] active:shadow-inner",
    link: "text-primary underline-offset-4 hover:underline active:scale-[0.96]",
  };
  
  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };
  
  return cn(baseClasses, variantClasses[variant], sizeClasses[size]);
};

const EnhancedButton = React.forwardRef(({ 
  className, 
  variant, 
  size, 
  asChild = false, 
  loading = false,
  loadingText,
  children,
  onClick,
  disabled,
  ripple = true,
  ...props 
}, ref) => {
  const [isClicked, setIsClicked] = React.useState(false);
  const [ripples, setRipples] = React.useState([]);
  
  const Comp = asChild ? Slot : "button";
  
  const handleClick = React.useCallback((e) => {
    if (loading || disabled) return;
    
    // Vibração tátil para dispositivos móveis
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50); // Vibração curta de 50ms
    }
    
    setIsClicked(true);
    
    // Ripple effect
    if (ripple) {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      const newRipple = {
        x,
        y,
        size,
        id: Date.now()
      };
      
      setRipples(prev => [...prev, newRipple]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }
    
    // Reset click state
    setTimeout(() => {
      setIsClicked(false);
    }, 150);
    
    // Call original onClick
    if (onClick) {
      onClick(e);
    }
  }, [loading, disabled, ripple, onClick]);

  return (
    <Comp
      className={cn(
        getButtonVariants(variant, size),
        loading && "cursor-not-allowed",
        isClicked && "transform scale-[0.94] shadow-inner",
        className
      )}
      ref={ref}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {/* Ripple effects */}
      {ripple && ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full pointer-events-none animate-ping"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            animationDuration: '600ms',
            animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      ))}
      
      {/* Content */}
      <span className={cn(
        "flex items-center gap-2 transition-opacity duration-200",
        loading && "opacity-0"
      )}>
        {children}
      </span>
      
      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Spinner size="sm" />
            {loadingText && (
              <span className="text-sm">{loadingText}</span>
            )}
          </div>
        </div>
      )}
    </Comp>
  );
});

EnhancedButton.displayName = "EnhancedButton";

export { EnhancedButton, getButtonVariants as buttonVariants };