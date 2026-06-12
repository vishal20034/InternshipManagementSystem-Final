"use client";

import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost" | "outline" | "destructive";
  size?: "sm" | "default" | "lg" | "icon";
};

const variants = {
  default: "bg-[#CB5534] text-white hover:bg-[#B24629] active:scale-95 transition-all duration-150",
  secondary: "bg-[#CB5534]/10 text-[#CB5534] hover:bg-[#CB5534]/20 active:scale-95 transition-all duration-150",
  ghost: "bg-transparent text-[#1E1A17] hover:bg-[#CB5534]/5",
  outline: "border border-[#E2D9CD] bg-transparent text-[#1E1A17] hover:bg-[#CB5534]/5 hover:border-[#CB5534]/30 active:scale-95 transition-all duration-150",
  destructive: "bg-rose-600 text-white hover:bg-rose-500 active:scale-95 transition-all duration-150",
};

const sizes = {
  sm: "h-9 px-3 text-xs",
  default: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-sm",
  icon: "h-10 w-10 p-0",
};

export function Button({ className = "", variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CB5534]/50",
        variants[variant],
        sizes[size],
        className,
      ].join(" ")}
      {...props}
    />
  );
}
