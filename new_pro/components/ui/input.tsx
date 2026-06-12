"use client";

import * as React from "react";

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={[
        "h-11 w-full rounded-lg border border-[#E2D9CD] bg-[#FDFCF7] px-3 text-sm text-[#1E1A17]",
        "placeholder:text-[#8E8279] focus:border-[#CB5534]/60 focus:outline-none focus:ring-2 focus:ring-[#CB5534]/20",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
