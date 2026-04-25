"use client";

import React from "react";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

interface TranslatedTextProps {
  text: string;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
}

/**
 * Renders a string with auto-translation based on the user's selected language.
 * Uses the MyMemory API via useAutoTranslate hook.
 */
export function TranslatedText({ text, className, as: Component = "span" }: TranslatedTextProps) {
  const { translated, loading } = useAutoTranslate(text);
  
  return (
    <Component
      className={`${className || ""} transition-opacity duration-200 ${
        loading ? "opacity-50" : "opacity-100"
      }`}
    >
      {translated}
    </Component>
  );
}
