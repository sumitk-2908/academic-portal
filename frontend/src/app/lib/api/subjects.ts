import { supabase } from './core';

export interface Subject {
  id: number;
  name: string;
  slug: string;
  is_non_module: boolean;
}

export interface Module {
  id: number;
  subject_id: number;
  module_number: number;
  name: string;
}

export const getSubjects = async () => {
  const { data, error } = await supabase.from('subjects').select('*').order('name');
  if (error) throw error;
  return data as Subject[];
};

export const getModulesBySubject = async (subjectId: number) => {
  const { data, error } = await supabase.from('modules').select('*').eq('subject_id', subjectId).order('module_number');
  if (error) throw error;
  return data as Module[];
};

export const createSubject = async (subject: Omit<Subject, 'id'>) => {
  const { data, error } = await supabase.from('subjects').insert([subject]).select().single();
  if (error) throw error;
  return data as Subject;
};

export const updateSubject = async (id: number, updates: Partial<Subject>) => {
  const { data, error } = await supabase.from('subjects').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Subject;
};

export const deleteSubject = async (id: number, name: string) => {
  const { count, error: countError } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('subject', name);
  if (countError) throw countError;
  if (count && count > 0) throw new Error("Cannot delete subject: there are documents associated with it.");
  
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) throw error;
};

export const createModule = async (module: Omit<Module, 'id'>) => {
  const { data, error } = await supabase.from('modules').insert([module]).select().single();
  if (error) throw error;
  return data as Module;
};

export const updateModule = async (id: number, updates: Partial<Module>) => {
  const { data, error } = await supabase.from('modules').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Module;
};

export const deleteModule = async (id: number, subjectName: string, moduleId: number) => {
  const { count, error: countError } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('subject', subjectName).eq('module_id', moduleId);
  if (countError) throw countError;
  if (count && count > 0) throw new Error("Cannot delete module: there are documents associated with it.");

  const { error } = await supabase.from('modules').delete().eq('id', id);
  if (error) throw error;
};
