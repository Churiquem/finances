import React from 'react';
import {
  Tag,
  ShoppingCart,
  Home,
  Car,
  Briefcase,
  Zap,
  Coffee,
  Tv,
  Activity,
  BookOpen,
  PieChart,
  Users,
  Utensils,
  Plane,
  Film,
  Dumbbell,
  Smartphone,
  Heart,
  Wrench,
  DollarSign,
  Gift,
  Shield,
  Music,
} from 'lucide-react';

export const ICON_COMPONENTS: Record<string, React.ElementType> = {
  'tag': Tag,
  'shopping-cart': ShoppingCart,
  'home': Home,
  'car': Car,
  'briefcase': Briefcase,
  'zap': Zap,
  'coffee': Coffee,
  'tv': Tv,
  'activity': Activity,
  'book-open': BookOpen,
  'pie-chart': PieChart,
  'users': Users,
  'utensils': Utensils,
  'plane': Plane,
  'film': Film,
  'dumbbell': Dumbbell,
  'smartphone': Smartphone,
  'heart': Heart,
  'wrench': Wrench,
  'dollar-sign': DollarSign,
  'gift': Gift,
  'shield': Shield,
  'music': Music,
};

export const ICONS_LIST = Object.keys(ICON_COMPONENTS);

export function getCategoryIcon(iconName?: string | null): React.ElementType {
  if (iconName && ICON_COMPONENTS[iconName]) {
    return ICON_COMPONENTS[iconName];
  }
  return Tag;
}
