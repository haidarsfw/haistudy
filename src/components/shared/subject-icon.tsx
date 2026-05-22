"use client";

import {
  BarChart3,
  TrendingUp,
  Shield,
  Calculator,
  Bot,
  Scale,
  Settings2,
  BookOpen,
  type LucideProps,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  BarChart3,
  TrendingUp,
  Shield,
  Calculator,
  Bot,
  Scale,
  Settings2,
  BookOpen,
};

interface SubjectIconProps extends LucideProps {
  icon: string;
}

export function SubjectIcon({ icon, ...props }: SubjectIconProps) {
  const Icon = iconMap[icon] || BookOpen;
  return <Icon {...props} />;
}
