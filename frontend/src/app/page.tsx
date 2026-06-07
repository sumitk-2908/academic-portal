"use client";

import { useEffect, useState } from "react";
// NOTICE: We added 'supabase' to the import list below!
import { getDocumentsByModule, uploadDocument, deleteDocument, supabase } from "./lib/api"; 
import { FileText, Download, BookOpen, Plus, Upload, X, Lock, Unlock, Trash2 } from "lucide-react";

interface Document {
  id: number;
  title: string;
  category: string;
  file_url: string;
  uploaded_by: string;
  created_at: string;
}

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdmin, setIsAdmin] = useState(false);

  // --- NEW SUPABASE AUTH STATES ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("notes");
  const [uploadedBy, setUploadedBy] = useState("");

  const fetchDocs = async () => {
    try {
      const data = await getDocumentsByModule(1);
      setDocuments(data);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    
    // --- NEW: Check if we are already logged in when the page loads ---
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsAdmin(true);
    });
  }, []);

  // --- NEW: Real Supabase Login Function ---
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
    } else {
      setIsAdmin(true);
      setEmail("");
      setPassword("");
    }
  };

  // --- NEW: Real Supabase Logout Function ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setShowForm(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please select a file!");

    setUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("category", category);
    formData.append("module_id", "1");
    formData.append("uploaded_by", uploadedBy || "Admin");

    try {
      await uploadDocument(formData);
      setFile(null);
      setTitle("");
      setUploadedBy("");
      setShowForm(false);
      await fetchDocs(); 
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Check terminal for details.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this PDF forever?")) return;

    try {
      await deleteDocument(id);
      await fetchDocs(); 
    } catch (error) {
      console.error("Failed to delete document:", error);
      alert("Failed to delete. Check your terminal.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-blue-600 rounded-2xl p-8 text-white shadow-lg flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BookOpen size={32} />
              Academic Portal
            </h1>
            <p className="text-blue-100 mt-2 text-lg">
              Module 1: Introduction to C Programming
            </p>
          </div>

          {/* --- NEW: The Secure Login UI --- */}
          {!isAdmin ? (
            <form onSubmit={handleAdminLogin} className="flex flex-col gap-2 bg-white p-4 rounded-xl shadow-sm border border-blue-100 min-w-[250px]">
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Admin Email" 
                className="p-2 border border-slate-300 rounded-md text-sm outline-none text-slate-800 focus:ring-2 focus:ring-blue-600" 
                required
              />
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Password" 
                className="p-2 border border-slate-300 rounded-md text-sm outline-none text-slate-800 focus:ring-2 focus:ring-blue-600" 
                required
              />
              {authError && <p className="text-xs text-red-500 font-semibold">{authError}</p>}
              <button type="submit" className="flex justify-center items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-800 transition-colors text-sm">
                <Lock size={16} /> Login
              </button>
            </form>
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 bg-white text-blue-600 px-5 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-sm"
              >
                {showForm ? <X size={20} /> : <Plus size={20} />}
                {showForm ? "Cancel" : "Upload PDF"}
              </button>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-sm"
              >
                <Unlock size={20} /> Logout
              </button>
            </div>
          )}
        </div>

        {/* The Upload Form */}
        {isAdmin && showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-in slide-in-from-top-4 fade-in duration-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Upload size={20} className="text-blue-600"/> 
              Upload New Document
            </h2>
            <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Document Title</label>
                <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 1 Summary" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"/>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white">
                  <option value="notes">Notes</option>
                  <option value="pyq">PYQ (Previous Year Question)</option>
                  <option value="syllabus">Syllabus</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Your Name (Optional)</label>
                <input type="text" value={uploadedBy} onChange={(e) => setUploadedBy(e.target.value)} placeholder="Admin" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"/>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">PDF File</label>
                <input required type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full p-1.5 border border-slate-300 rounded-lg file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
              </div>
              <div className="md:col-span-2 mt-2">
                <button disabled={uploading} type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex justify-center items-center gap-2">
                  {uploading ? "Uploading to Server..." : "Submit Document"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Document List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-6 border-b pb-4 flex items-center justify-between">
            Available Study Materials
            {isAdmin && <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-md">Admin Mode Active</span>}
          </h2>

          {loading ? (
            <div className="text-center text-slate-500 py-8 animate-pulse">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center text-slate-500 py-8">No documents uploaded yet.</div>
          ) : (
            <div className="grid gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-lg text-blue-600 shadow-sm group-hover:text-blue-700">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{doc.title}</h3>
                      <p className="text-sm text-slate-500 capitalize">
                        {doc.category.replace('_', ' ')} • Uploaded by {doc.uploaded_by || 'Anonymous'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(doc.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm"
                          title="Delete Document"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                      
                      <a 
                        href={doc.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                      >
                        <Download size={18} />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}