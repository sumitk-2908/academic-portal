"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/app/lib/api"; // Adjust import path if needed

type StudyHistoryContextType = {
  history: any[];
  addDocumentToHistory: (doc: any) => Promise<void>;
};

const StudyHistoryContext = createContext<StudyHistoryContextType | undefined>(undefined);

export const StudyHistoryProvider = ({ children }: { children: React.ReactNode }) => {
  const [history, setHistory] = useState<any[]>([]);

  // Load initial history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("portal_study_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Resetting corrupted history local storage");
    }
  }, []);

  const addDocumentToHistory = async (doc: any) => {
    // 1. Update React State & Local Storage safely using functional state updates
    setHistory((prevHistory) => {
      let newHistory = prevHistory.filter((d) => d.id !== doc.id);
      newHistory.unshift(doc);
      newHistory = newHistory.slice(0, 5); // Keep top 5
      
      localStorage.setItem("portal_study_history", JSON.stringify(newHistory));
      return newHistory;
    });

    // 2. Sync to Supabase in the background
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      const userId = sessionData.session.user.id;
      await supabase.from("study_history").upsert(
        {
          user_id: userId,
          document_id: doc.id,
          accessed_at: new Date().toISOString(),
        },
        { onConflict: "user_id, document_id" }
      );
    }
  };

  return (
    <StudyHistoryContext.Provider value={{ history, addDocumentToHistory }}>
      {children}
    </StudyHistoryContext.Provider>
  );
};

// Helper hook
export const useStudyHistory = () => {
  const context = useContext(StudyHistoryContext);
  if (!context) {
    throw new Error("useStudyHistory must be used within a StudyHistoryProvider");
  }
  return context;
};