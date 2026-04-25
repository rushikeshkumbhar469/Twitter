"use client";

import React, { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useAuth } from "./authcontext";
import { translations } from "../lib/translations";

interface TranslationContextType {
  t: (key: string) => string;
  language: string;
}

const TranslationContext = createContext<TranslationContextType | null>(null);

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === null) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
};

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    if (user?.language) {
      setLanguage(user.language);
    } else {
      setLanguage("en");
    }
  }, [user?.language]);

  const t = (key: string) => {
    const langDict = translations[language] || translations["en"];
    return langDict[key] || translations["en"][key] || key;
  };

  return (
    <TranslationContext.Provider value={{ t, language }}>
      {children}
    </TranslationContext.Provider>
  );
};
