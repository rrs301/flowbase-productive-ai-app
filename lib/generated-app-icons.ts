import {
  Activity,
  BadgeDollarSign,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  Flame,
  GraduationCap,
  Heart,
  LayoutTemplate,
  ListChecks,
  LucideIcon,
  NotebookPen,
  PiggyBank,
  Sparkles,
  Target,
  Utensils,
} from "lucide-react";

export const generatedAppIconMap: Record<string, LucideIcon> = {
  Activity,
  BadgeDollarSign,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  Flame,
  GraduationCap,
  Heart,
  LayoutTemplate,
  ListChecks,
  NotebookPen,
  PiggyBank,
  Sparkles,
  Target,
  Utensils,
};

export function getGeneratedAppIcon(name: string) {
  return generatedAppIconMap[name] ?? LayoutTemplate;
}
