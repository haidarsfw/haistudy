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
  Users,
  Monitor,
  Briefcase,
  type IconProps,
} from "@/components/ui/icons";

const iconMap: Record<string, React.ComponentType<IconProps>> = {
  BarChart3,
  TrendingUp,
  Shield,
  Calculator,
  Bot,
  Scale,
  Settings2,
  BookOpen,
  Users,
  Monitor,
  Briefcase,
};

interface SubjectIconProps extends IconProps {
  icon: string;
}

export function SubjectIcon({ icon, ...props }: SubjectIconProps) {
  const Icon = iconMap[icon] || BookOpen;
  return <Icon {...props} />;
}
