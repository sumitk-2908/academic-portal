"use client";

import { useCallback, useEffect, useState } from "react";
import { getSubjects, getModulesBySubject, createSubject, updateSubject, deleteSubject, createModule, updateModule, deleteModule, Subject, Module } from "@/app/lib/api/subjects";
import { revalidateContentCache } from "@/app/actions/cache";
import { ArrowLeft, Plus, Pencil, Trash2, X, BookOpen, Layers } from "lucide-react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { InlineSpinner } from "@/components/layout/SharedLayouts";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { useNotifications } from "@/app/context/NotificationsContext";

function AdminSubjectsContent() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);

  const { setGlobalToast } = useNotifications();
  const setToast = (t: { open: boolean, message: string, type: "success" | "error" }) => {
    setGlobalToast({ open: t.open, title: t.type === 'error' ? 'Error' : 'Success', message: t.message, type: t.type });
  };

  // Modals state
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({ name: "", slug: "", is_non_module: false });

  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleForm, setModuleForm] = useState({ name: "", module_number: 1 });

  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "subject"; subject: Subject }
    | { type: "module"; module: Module }
    | null
  >(null);

  const loadSubjects = useCallback(async () => {
    setLoadingSubjects(true);
    try {
      const data = await getSubjects();
      setSubjects(data);
    } catch (e: any) {
      setToast({ open: true, message: "Failed to load subjects", type: "error" });
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const handleSelectSubject = async (subject: Subject) => {
    setSelectedSubject(subject);
    setLoadingModules(true);
    try {
      const data = await getModulesBySubject(subject.id);
      setModules(data);
    } catch (e: any) {
      setToast({ open: true, message: "Failed to load modules", type: "error" });
    } finally {
      setLoadingModules(false);
    }
  };

  // Subject Actions
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      if (editingSubject) {
        const updated = await updateSubject(editingSubject.id, subjectForm);
        setSubjects(prev => prev.map(s => s.id === updated.id ? updated : s));
        if (selectedSubject?.id === updated.id) setSelectedSubject(updated);
        setToast({ open: true, message: "Subject updated successfully", type: "success" });
      } else {
        const created = await createSubject(subjectForm);
        setSubjects(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setToast({ open: true, message: "Subject created successfully", type: "success" });
      }
      await revalidateContentCache();
      setIsSubjectModalOpen(false);
    } catch (e: any) {
      setToast({ open: true, message: e.message || "Failed to save subject", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSubject = async (subject: Subject) => {
    setIsProcessing(true);
    try {
      await deleteSubject(subject.id, subject.name);
      setSubjects(prev => prev.filter(s => s.id !== subject.id));
      if (selectedSubject?.id === subject.id) {
        setSelectedSubject(null);
        setModules([]);
      }
      await revalidateContentCache();
      setToast({ open: true, message: "Subject deleted successfully", type: "success" });
    } catch (e: any) {
      setToast({ open: true, message: e.message || "Failed to delete subject", type: "error" });
    } finally {
      setIsProcessing(false);
      setDeleteTarget(null);
    }
  };

  const openAddSubject = () => {
    setEditingSubject(null);
    setSubjectForm({ name: "", slug: "", is_non_module: false });
    setIsSubjectModalOpen(true);
  };

  const openEditSubject = (subject: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubject(subject);
    setSubjectForm({ name: subject.name, slug: subject.slug, is_non_module: subject.is_non_module });
    setIsSubjectModalOpen(true);
  };

  // Module Actions
  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;
    setIsProcessing(true);
    try {
      if (editingModule) {
        const updated = await updateModule(editingModule.id, { ...moduleForm });
        setModules(prev => prev.map(m => m.id === updated.id ? updated : m).sort((a, b) => a.module_number - b.module_number));
        setToast({ open: true, message: "Module updated successfully", type: "success" });
      } else {
        const created = await createModule({ ...moduleForm, subject_id: selectedSubject.id });
        setModules(prev => [...prev, created].sort((a, b) => a.module_number - b.module_number));
        setToast({ open: true, message: "Module created successfully", type: "success" });
      }
      await revalidateContentCache();
      setIsModuleModalOpen(false);
    } catch (e: any) {
      setToast({ open: true, message: e.message || "Failed to save module", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteModule = async (module: Module) => {
    if (!selectedSubject) return;
    setIsProcessing(true);
    try {
      await deleteModule(module.id, selectedSubject.name, module.module_number);
      setModules(prev => prev.filter(m => m.id !== module.id));
      await revalidateContentCache();
      setToast({ open: true, message: "Module deleted successfully", type: "success" });
    } catch (e: any) {
      setToast({ open: true, message: e.message || "Failed to delete module", type: "error" });
    } finally {
      setIsProcessing(false);
      setDeleteTarget(null);
    }
  };

  const confirmDeleteTarget = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "subject") {
      void handleDeleteSubject(deleteTarget.subject);
    } else {
      void handleDeleteModule(deleteTarget.module);
    }
  };

  const openAddModule = () => {
    setEditingModule(null);
    const nextNum = modules.length > 0 ? Math.max(...modules.map(m => m.module_number)) + 1 : 1;
    setModuleForm({ name: "", module_number: nextNum });
    setIsModuleModalOpen(true);
  };

  const openEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleForm({ name: module.name || "", module_number: module.module_number });
    setIsModuleModalOpen(true);
  };

  return (
    <main className="animate-fade-up mx-auto w-full max-w-6xl space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <Link href="/subject/admin/inbox" className="motion-hover inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-primary">
          <ArrowLeft size={14} /> Back to Inbox
        </Link>
        <Link href="/portal-admin/analytics" className="motion-hover inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20">
          View Analytics
        </Link>
      </div>

      <section className="premium-transition flex items-center gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-6">
        <div className="premium-transition flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BookOpen size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Content Management</h1>
          <p className="mt-0.5 text-xs font-semibold tracking-wider text-primary">
            Manage subjects and their respective modules.
          </p>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Subjects List */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
            <h2 className="text-lg font-bold text-foreground">Subjects</h2>
            <button onClick={openAddSubject} className="motion-hover motion-active flex items-center gap-2 rounded-xl bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground hover:opacity-90">
              <Plus size={16} /> Add
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[500px] space-y-3">
            {loadingSubjects ? (
              <div className="flex justify-center p-8"><InlineSpinner label="Loading subjects..." /></div>
            ) : subjects.length === 0 ? (
              <p className="text-center text-sm text-muted py-8">No subjects found.</p>
            ) : (
              subjects.map(subject => (
                <div 
                  key={subject.id} 
                  onClick={() => handleSelectSubject(subject)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer premium-transition ${selectedSubject?.id === subject.id ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-surface-hover'}`}
                >
                  <div>
                    <h3 className="font-bold text-foreground">{subject.name}</h3>
                    <p className="text-xs text-muted">/{subject.slug}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => openEditSubject(subject, e)} className="p-2 text-muted hover:text-primary motion-hover" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "subject", subject }); }} className="p-2 text-muted hover:text-destructive motion-hover" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modules List */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
            <h2 className="text-lg font-bold text-foreground">
              {selectedSubject ? `Modules for ${selectedSubject.name}` : "Select a Subject"}
            </h2>
            {selectedSubject && (
              <button onClick={openAddModule} className="motion-hover motion-active flex items-center gap-2 rounded-xl bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                <Plus size={16} /> Add Module
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[500px] space-y-3">
            {!selectedSubject ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted">
                <Layers size={48} className="mb-4 opacity-20" />
                <p>Select a subject from the list to view and manage its modules.</p>
              </div>
            ) : loadingModules ? (
              <div className="flex justify-center p-8"><InlineSpinner label="Loading modules..." /></div>
            ) : modules.length === 0 ? (
              <p className="text-center text-sm text-muted py-8">No modules exist for this subject.</p>
            ) : (
              modules.map(module => (
                <div key={module.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                  <div>
                    <h3 className="font-bold text-foreground">Module {module.module_number}</h3>
                    {module.name && <p className="text-xs text-muted">{module.name}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditModule(module)} className="p-2 text-muted hover:text-primary motion-hover" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget({ type: "module", module })} className="p-2 text-muted hover:text-destructive motion-hover" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- MODAL: ADD/EDIT SUBJECT --- */}
      <Dialog.Root open={isSubjectModalOpen} onOpenChange={setIsSubjectModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="motion-modal fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="motion-modal fixed top-[50%] left-[50%] z-50 grid w-full max-w-md translate-[-50%] gap-4 rounded-2xl bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-xl font-bold text-foreground">
                {editingSubject ? "Edit Subject" : "Add Subject"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="motion-hover text-muted hover:text-foreground"><X size={20} /></button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleSaveSubject} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-foreground">Subject Name</label>
                <input 
                  required
                  type="text" 
                  value={subjectForm.name} 
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value, slug: editingSubject ? subjectForm.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') })}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                  placeholder="e.g. Mathematics 1"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-foreground">URL Slug</label>
                <input 
                  required
                  type="text" 
                  value={subjectForm.slug} 
                  onChange={(e) => setSubjectForm({ ...subjectForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') })}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                  placeholder="e.g. mathematics-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="is_non_module"
                  checked={subjectForm.is_non_module} 
                  onChange={(e) => setSubjectForm({ ...subjectForm, is_non_module: e.target.checked })}
                  className="size-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="is_non_module" className="text-sm font-semibold text-foreground">Non-Module Subject (e.g. Previous Year Papers only)</label>
              </div>
              
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
                <Dialog.Close asChild><button type="button" className="motion-hover rounded-xl bg-surface-hover px-4 py-2 text-sm font-bold">Cancel</button></Dialog.Close>
                <button type="submit" disabled={isProcessing} className="motion-hover motion-active flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {isProcessing ? <InlineSpinner label="Saving" size={16} /> : "Save Subject"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* --- MODAL: ADD/EDIT MODULE --- */}
      <Dialog.Root open={isModuleModalOpen} onOpenChange={setIsModuleModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="motion-modal fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="motion-modal fixed top-[50%] left-[50%] z-50 grid w-full max-w-md translate-[-50%] gap-4 rounded-2xl bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-xl font-bold text-foreground">
                {editingModule ? "Edit Module" : "Add Module"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="motion-hover text-muted hover:text-foreground"><X size={20} /></button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleSaveModule} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-foreground">Module Number</label>
                <input 
                  required
                  type="number" 
                  min="1"
                  value={moduleForm.module_number} 
                  onChange={(e) => setModuleForm({ ...moduleForm, module_number: parseInt(e.target.value) || 1 })}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-foreground">Module Name (Optional)</label>
                <input 
                  type="text" 
                  value={moduleForm.name} 
                  onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                  placeholder="e.g. Integration"
                />
              </div>
              
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
                <Dialog.Close asChild><button type="button" className="motion-hover rounded-xl bg-surface-hover px-4 py-2 text-sm font-bold">Cancel</button></Dialog.Close>
                <button type="submit" disabled={isProcessing} className="motion-hover motion-active flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {isProcessing ? <InlineSpinner label="Saving" size={16} /> : "Save Module"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="motion-modal fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="motion-modal fixed top-[50%] left-[50%] z-50 w-[calc(100vw-2rem)] max-w-md translate-[-50%] rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <Dialog.Title className="text-xl font-bold text-foreground">
              {deleteTarget?.type === "subject" ? "Delete subject" : "Delete module"}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-muted">
              {deleteTarget?.type === "subject"
                ? `Delete ${deleteTarget.subject.name}? Documents tied to this subject may become harder to organize.`
                : `Delete Module ${deleteTarget?.module.module_number}? Documents assigned to this module may need review.`}
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
              <Dialog.Close asChild>
                <button type="button" className="motion-hover rounded-xl bg-surface-hover px-4 py-2 text-sm font-bold text-foreground">Cancel</button>
              </Dialog.Close>
              <button
                type="button"
                onClick={confirmDeleteTarget}
                disabled={isProcessing}
                className="motion-hover motion-active flex items-center gap-2 rounded-xl bg-destructive px-5 py-2 text-sm font-bold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isProcessing ? <InlineSpinner label="Deleting" size={16} /> : <Trash2 size={16} />} Delete
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </main>
  );
}

export default function AdminSubjectsRoute() {
  return (
    <ErrorBoundary
      title="Content management could not load"
      message="The subjects and modules dashboard ran into a problem."
    >
      <AdminSubjectsContent />
    </ErrorBoundary>
  );
}
