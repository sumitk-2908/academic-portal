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

export const SUBJECT_UI_MAP: Record<string, any> = {
   "maths-1":{icon: Calculator, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10 dark:bg-blue-400/20", hoverBg: "group-hover:bg-blue-500 dark:group-hover:bg-blue-400" },
   "maths-2":{icon: Calculator, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10 dark:bg-blue-400/20", hoverBg: "group-hover:bg-blue-500 dark:group-hover:bg-blue-400" },
   "physics":{icon: Atom, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-500/10 dark:bg-amber-400/20", hoverBg: "group-hover:bg-amber-500 dark:group-hover:bg-amber-400" },
   "bee":{icon: Zap, color: "text-yellow-500 dark:text-yellow-400", bg: "bg-yellow-500/10 dark:bg-yellow-400/20", hoverBg: "group-hover:bg-yellow-500 dark:group-hover:bg-yellow-400" },
   "pps":{icon: Terminal, color: "text-indigo-500 dark:text-indigo-400", bg: "bg-indigo-500/10 dark:bg-indigo-400/20", hoverBg: "group-hover:bg-indigo-500 dark:group-hover:bg-indigo-400" },
   "biology":{icon: Leaf, color: "text-green-500 dark:text-green-400", bg: "bg-green-500/10 dark:bg-green-400/20", hoverBg: "group-hover:bg-green-500 dark:group-hover:bg-green-400" },
   "workshop":{icon: Wrench, color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-500/10 dark:bg-orange-400/20", hoverBg: "group-hover:bg-orange-500 dark:group-hover:bg-orange-400" },
   "physics-lab":{icon: Beaker, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-500/10 dark:bg-amber-400/20", hoverBg: "group-hover:bg-amber-500 dark:group-hover:bg-amber-400" },
   "chemistry":{icon: Beaker, color: "text-teal-500 dark:text-teal-400", bg: "bg-teal-500/10 dark:bg-teal-400/20", hoverBg: "group-hover:bg-teal-500 dark:group-hover:bg-teal-400" },
   "engineering-graphics":{icon: PenTool, color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-500/10 dark:bg-purple-400/20", hoverBg: "group-hover:bg-purple-500 dark:group-hover:bg-purple-400" },
    "be":{icon: BookOpen, color: "text-rose-500 dark:text-rose-400", bg: "bg-rose-500/10 dark:bg-rose-400/20", hoverBg: "group-hover:bg-rose-500 dark:group-hover:bg-rose-400" },
    "bme":{icon: Wrench, color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-500/10 dark:bg-orange-400/20", hoverBg: "group-hover:bg-orange-500 dark:group-hover:bg-orange-400" },
    "communication-skills":{icon: MessageSquare, color: "text-pink-500 dark:text-pink-400", bg: "bg-pink-500/10 dark:bg-pink-400/20", hoverBg: "group-hover:bg-pink-500 dark:group-hover:bg-pink-400" },
    "environmental-science":{icon: Globe, color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500/10 dark:bg-emerald-400/20", hoverBg: "group-hover:bg-emerald-500 dark:group-hover:bg-emerald-400" },
    "nss":{icon: Users, color: "text-red-500 dark:text-red-400", bg: "bg-red-500/10 dark:bg-red-400/20", hoverBg: "group-hover:bg-red-500 dark:group-hover:bg-red-400" },
    "bee-lab":{icon: Zap, color: "text-yellow-500 dark:text-yellow-400", bg: "bg-yellow-500/10 dark:bg-yellow-400/20", hoverBg: "group-hover:bg-yellow-500 dark:group-hover:bg-yellow-400" },
    "chemistry-lab":{icon: Beaker, color: "text-teal-500 dark:text-teal-400", bg: "bg-teal-500/10 dark:bg-teal-400/20", hoverBg: "group-hover:bg-teal-500 dark:group-hover:bg-teal-400" },
    "be-lab":{icon: BookOpen, color: "text-rose-500 dark:text-rose-400", bg: "bg-rose-500/10 dark:bg-rose-400/20", hoverBg: "group-hover:bg-rose-500 dark:group-hover:bg-rose-400" },
    "default": { icon: BookOpen, color: "text-gray-500", bg: "bg-gray-100", hoverBg: "group-hover:bg-gray-500" }
};