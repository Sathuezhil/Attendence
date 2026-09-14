import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type AppIconName = ComponentProps<typeof Ionicons>['name'];

export function AppIcon({
  name,
  size = 20,
  color,
}: {
  name: AppIconName;
  size?: number;
  color: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
