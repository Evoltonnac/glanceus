import { z } from 'zod';
import type { ReactNode } from 'react';

/**
 * ActionSet Schema
 *
 * Horizontal container for action buttons with consistent spacing and alignment.
 * Ensures safe and uniform presentation of interactive elements.
 */
export const ActionSetSchema = z.object({
  type: z.literal('ActionSet'),
  actions: z.array(z.any()), // Will contain Action.* schemas
  horizontalAlignment: z.enum(['left', 'center', 'right']).default('left'),
  spacing: z.enum(['compact', 'default', 'relaxed']).default('default'),
});

export type ActionSetProps = z.infer<typeof ActionSetSchema>;

const alignmentMap = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

const spacingMap = {
  compact: 'gap-1',
  default: 'gap-2',
  relaxed: 'gap-4',
};

interface ActionSetComponentProps {
  horizontalAlignment?: 'left' | 'center' | 'right';
  spacing?: 'compact' | 'default' | 'relaxed';
  children: ReactNode;
}

export function ActionSet({
  horizontalAlignment = 'left',
  spacing = 'default',
  children,
}: ActionSetComponentProps) {
  return (
    <div className={`flex flex-row items-center ${alignmentMap[horizontalAlignment as keyof typeof alignmentMap]} ${spacingMap[spacing as keyof typeof spacingMap]}`}>
      {children}
    </div>
  );
}
