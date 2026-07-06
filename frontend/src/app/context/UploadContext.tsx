"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { uploadDocument, UploadState } from "@/app/lib/api";
import { isNonModuleSubject } from "@/app/lib/subject-config";
import { useAuth } from "@/app/context/AuthContext";

interface UploadContextType {
  showUploadForm: boolean;
  uploading: boolean;
  file: File | null;
  uploadTitle: string;
  uploadCategory: string;
  uploadSubject: string;
  uploadModule: number;
  uploadState: UploadState;
  uploadProgress: number;
  uploadErrorMsg: string;

  setShowUploadForm: (v: boolean) => void;
  setFile: (v: File | null) => void;
  setUploadTitle: (v: string) => void;
  setUploadCategory: (v: string) => void;
  setUploadSubject: (v: string) => void;
  setUploadModule: (v: number) => void;
  handleUpload: (e: React.FormEvent) => Promise<void>;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin, isStudent, uploadedBy, openAuthPrompt } = useAuth();
  
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("notes");
  const [uploadSubject, setUploadSubject] = useState("MATHS 1");
  const [uploadModule, setUploadModule] = useState(1);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErrorMsg, setUploadErrorMsg] = useState("");

  const showToast = (title: string, message: string, type: "default" | "error" | "success" = "default") => {
    window.dispatchEvent(new CustomEvent("portal_toast", { detail: { title, message, type } }));
  };

  useEffect(() => {
    const handleUploadPrompt = () => {
      if (isAdmin || isStudent) setShowUploadForm(true);
      else openAuthPrompt("upload");
    };

    window.addEventListener("portal_upload_prompt", handleUploadPrompt);
    return () => window.removeEventListener("portal_upload_prompt", handleUploadPrompt);
  }, [isAdmin, isStudent, openAuthPrompt]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      showToast("Upload Error", "Please map a PDF resource!", "error");
      return;
    }
    if (file.size > 52428800) {
      alert("Upload blocked: File size exceeds the 50MB limit.");
      return;
    }

    setUploadState("idle"); 
    setUploadProgress(0); 
    setUploadErrorMsg(""); 
    setUploading(true);

    const formData = new FormData();
    const authorName = uploadedBy || (isAdmin ? "Admin" : "Student");
    formData.append("file", file); 
    formData.append('title', uploadTitle); 
    formData.append('uploader_name', authorName); 
    formData.append("category", uploadCategory); 
    const isModuleDisabled = uploadCategory === "syllabus" || isNonModuleSubject(uploadSubject);
    formData.append("module_id", isModuleDisabled ? "null" : String(uploadModule));
    formData.append("uploaded_by", authorName); 
    formData.append("subject", uploadSubject); 
    formData.append("status", isAdmin ? "approved" : "pending");

    try {
      await uploadDocument(formData, (percent) => setUploadProgress(percent), (state) => setUploadState(state));
      setTimeout(async () => {
        setFile(null); 
        setUploadTitle(""); 
        setShowUploadForm(false); 
        setUploadState("idle"); 
        setUploading(false);
        window.dispatchEvent(new Event("sidebar_update"));
        if (!isAdmin) showToast("Success", "Notes submitted! Pending admin approval.", "success");
      }, 1500);
    } catch (err: any) {
      setUploadState("error"); 
      setUploadErrorMsg(err.message || "Failed to upload file."); 
      setUploading(false);
      showToast("Upload Error", err.message || "Failed to upload file.", "error");
    }
  };

  return (
    <UploadContext.Provider value={{
      showUploadForm, uploading, file, uploadTitle, uploadCategory, uploadSubject, uploadModule, uploadState, uploadProgress, uploadErrorMsg,
      setShowUploadForm, setFile, setUploadTitle, setUploadCategory, setUploadSubject, setUploadModule, handleUpload
    }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
}
