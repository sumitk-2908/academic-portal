"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/app/lib/api"; 

export interface StudyDocument {
  id: number;
  title: string;
  category: "notes" | "pyq" | "syllabus" | string; 
  file_url: string;
  uploaded_by: string;
  created_at: string; 
  module_id: number | null;
  subject: string;
  status: "pending" | "approved" | "rejected"; 
  file_size: number | null;
  page_count: number | null;
  thumbnail_url: string | null;
}

type StudyHistoryContextType = {
  history: any[];
  addDocumentToHistory: (doc: any) => Promise<void>;
};

const StudyHistoryContext = createContext<StudyHistoryContextType | undefined>(undefined);

export const StudyHistoryProvider = ({ children }: { children: React.ReactNode }) => {
  const [history, setHistory] = useState<any[]>([]);

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
    setHistory((prevHistory) => {
      let newHistory = prevHistory.filter((d) => d.id !== doc.id);
      newHistory.unshift(doc);
      newHistory = newHistory.slice(0, 5); 
      
      localStorage.setItem("portal_study_history", JSON.stringify(newHistory));
      return newHistory;
    });

    // 🔥 CRITICAL FIX: Broadcast event so ClientLayout & Continue Studying pages still update!
    window.dispatchEvent(new Event("sidebar_update"));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        const userId = sessionData.session.user.id;
        const { error } = await supabase.from("study_history").upsert(
          {
            user_id: userId,
            document_id: doc.id,
            accessed_at: new Date().toISOString(),
          },
          { onConflict: "user_id, document_id" }
        );
        if (error) console.error("Failed to sync history to DB:", error.message);
      }
    } catch (error) {
      console.error("Network error while syncing study history");
    }
  };

  return (
    <StudyHistoryContext.Provider value={{ history, addDocumentToHistory }}>
      {children}
    </StudyHistoryContext.Provider>
  );
};

export const useStudyHistory = () => {
  const context = useContext(StudyHistoryContext);
  if (!context) {
    throw new Error("useStudyHistory must be used within a StudyHistoryProvider");
  }
  return context;
};