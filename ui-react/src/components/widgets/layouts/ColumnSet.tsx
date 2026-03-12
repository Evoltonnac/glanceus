import { z } from 'zod';
import type { ReactNode } from 'react';

/**
 * ColumnSet Schema
 *
 * Horizontal layout container that divides space into multiple columns.
 * Can only contain Column components as direct children.
 */
export const ColumnSetSchema = z.object({
  type: z.literal('ColumnSet'),
  columns: z.array(z.any()), // Will contain Column schemas
  spacing: z.enum(['none', 'small', 'default', 'large']).default('default'),
  horizontalAlignment: z.enum(['left', 'center', 'right']).default('left'),
});

export type ColumnSetProps = z.infer<typeof ColumnSetSchema>;

const spacingMap = {
  none: 'gap-0',
  small: 'gap-2',
  default: 'gap-4',
  large: 'gap-6',
};

const alignmentMap = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

interface ColumnSetComponentProps {
  spacing?: 'none' | 'small' | 'default' | 'large';
  horizontalAlignment?: 'left' | 'center' | 'right';
  children: ReactNode;
}

export function ColumnSet({ spacing = 'default', horizontalAlignment = 'left', children }: ColumnSetComponentProps) {
  return (
    <div className={`flex flex-row w-full ${spacingMap[spacing as keyof typeof spacingMap]} ${alignmentMap[horizontalAlignment as keyof typeof alignmentMap]}`}>
      {children}
    </div>
  );
}
