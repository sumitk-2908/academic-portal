import { 
  Calculator, 
  Atom, 
  Terminal, 
  Leaf, 
  Wrench, 
  Beaker, 
  Zap, 
  PenTool, 
  BookOpen, 
  MessageSquare, 
  Globe, 
  Users 
} from "lucide-react";

// Categorized strictly into the 5 semantic global tokens:
// Primary (Indigo), Success (Emerald), Warning (Amber), Destructive (Red), Muted (Zinc)

export const SUBJECT_UI_MAP: Record<string, any> = {
   "maths-1": { icon: Calculator, color: "text-primary", bg: "bg-primary/10", hoverBg: "group-hover:bg-primary", border: "border-primary" },
   "maths-2": { icon: Calculator, color: "text-primary", bg: "bg-primary/10", hoverBg: "group-hover:bg-primary", border: "border-primary" },
   "pps": { icon: Terminal, color: "text-primary", bg: "bg-primary/10", hoverBg: "group-hover:bg-primary", border: "border-primary" },
   "communication-skills": { icon: MessageSquare, color: "text-primary", bg: "bg-primary/10", hoverBg: "group-hover:bg-primary", border: "border-primary" },
   
   "biology": { icon: Leaf, color: "text-success", bg: "bg-success/10", hoverBg: "group-hover:bg-success", border: "border-success" },
   "environmental-science": { icon: Globe, color: "text-success", bg: "bg-success/10", hoverBg: "group-hover:bg-success", border: "border-success" },
   "chemistry": { icon: Beaker, color: "text-success", bg: "bg-success/10", hoverBg: "group-hover:bg-success", border: "border-success" },
   "chemistry-lab": { icon: Beaker, color: "text-success", bg: "bg-success/10", hoverBg: "group-hover:bg-success", border: "border-success" },

   "physics": { icon: Atom, color: "text-warning", bg: "bg-warning/10", hoverBg: "group-hover:bg-warning", border: "border-warning" },
   "physics-lab": { icon: Beaker, color: "text-warning", bg: "bg-warning/10", hoverBg: "group-hover:bg-warning", border: "border-warning" },
   "bee": { icon: Zap, color: "text-warning", bg: "bg-warning/10", hoverBg: "group-hover:bg-warning", border: "border-warning" },
   "bee-lab": { icon: Zap, color: "text-warning", bg: "bg-warning/10", hoverBg: "group-hover:bg-warning", border: "border-warning" },

   "workshop": { icon: Wrench, color: "text-destructive", bg: "bg-destructive/10", hoverBg: "group-hover:bg-destructive", border: "border-destructive" },
   "be": { icon: BookOpen, color: "text-destructive", bg: "bg-destructive/10", hoverBg: "group-hover:bg-destructive", border: "border-destructive" },
   "be-lab": { icon: BookOpen, color: "text-destructive", bg: "bg-destructive/10", hoverBg: "group-hover:bg-destructive", border: "border-destructive" },
   "bme": { icon: Wrench, color: "text-destructive", bg: "bg-destructive/10", hoverBg: "group-hover:bg-destructive", border: "border-destructive" },
   "nss": { icon: Users, color: "text-destructive", bg: "bg-destructive/10", hoverBg: "group-hover:bg-destructive", border: "border-destructive" },

   "engineering-graphics": { icon: PenTool, color: "text-sky-500", bg: "bg-sky-500/10", hoverBg: "group-hover:bg-sky-500", border: "border-sky-500" },
   
   "default": { icon: BookOpen, color: "text-primary", bg: "bg-primary/10", hoverBg: "group-hover:bg-primary", border: "border-primary" }
};