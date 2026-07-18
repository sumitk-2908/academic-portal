"use client";

import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { getProfilePreferences, getEnhancedContributions, deleteUserAccount } from "@/app/lib/api/profile";
import { getStudentBookmarks } from "@/app/lib/api/bookmarks";
import { getFullStudyHistory } from "@/app/lib/api/history";
import { Download, Trash2, ShieldAlert } from "lucide-react";
import { requestAuthPrompt } from "@/app/lib/auth-prompts";
import * as Dialog from "@radix-ui/react-dialog";

export default function DataExportPage() {
  const { userId, currentUserEmail, handleLogout } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="text-2xl font-bold">Sign in required</h1>
        <p className="mt-2 text-muted">You must be signed in to manage your data.</p>
        <button onClick={() => requestAuthPrompt("profile")} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          Sign In
        </button>
      </div>
    );
  }

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const [profile, contributions, bookmarks, history] = await Promise.all([
        getProfilePreferences(userId),
        getEnhancedContributions(userId),
        getStudentBookmarks(userId),
        getFullStudyHistory(userId)
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: userId,
        email: currentUserEmail,
        profile,
        contributions,
        bookmarks,
        study_history: history
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `academic-portal-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export data", error);
      alert("Failed to export data. Please try again later.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsDeleting(true);
    try {
      await deleteUserAccount();
      await handleLogout();
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to delete account", error);
      alert("Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="text-3xl font-extrabold text-foreground">Privacy & Data Management</h1>
      <p className="mt-2 text-muted">Manage your personal data, export your contributions, or permanently delete your account.</p>

      <div className="mt-8 space-y-6">
        {/* Export Section */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Export My Data</h2>
              <p className="mt-1 text-sm text-muted max-w-md">
                Download a JSON copy of all your personal data, including your profile preferences, bookmarks, study history, and uploaded documents.
              </p>
            </div>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isExporting ? <span className="animate-pulse">Exporting...</span> : <><Download size={16} /> Export JSON</>}
            </button>
          </div>
        </section>

        {/* Delete Section */}
        <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-destructive">Danger Zone: Delete Account</h2>
              <p className="mt-1 text-sm text-destructive/80 max-w-md">
                Permanently delete your account and all associated personal data. Your uploaded documents will remain but will be anonymized.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-white hover:opacity-90"
            >
              <Trash2 size={16} /> Delete Account
            </button>
          </div>
        </section>
      </div>

      <Dialog.Root open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3 text-destructive">
              <ShieldAlert size={24} />
              <Dialog.Title className="text-xl font-bold">Delete Account</Dialog.Title>
            </div>
            
            <p className="mb-4 text-sm text-foreground">
              This action is <strong>permanent and cannot be undone</strong>. Your personal data, bookmarks, and study history will be permanently deleted. Any documents or comments you contributed will be anonymized (your name will be removed).
            </p>
            
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-muted">
                Type <span className="select-all font-mono font-bold text-destructive">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full rounded-xl border border-destructive/30 bg-background p-3 font-mono outline-none focus:border-destructive"
                placeholder="DELETE"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl bg-surface-hover px-4 py-2 text-sm font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || isDeleting}
                className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
