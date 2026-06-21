"use client";

export default function SubjectProgress({ history }: { history: any[] }) {
  // Option B: Feature temporarily removed until real progress tracking 
  // (fetching the actual total document count per subject) is implemented.
  // Returning null ensures we never display fake percentages and 
  // safely removes the UI without breaking parent component imports.
  
  return null;
}