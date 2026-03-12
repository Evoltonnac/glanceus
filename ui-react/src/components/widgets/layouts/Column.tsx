import { z } from 'zod';
import type { ReactNode } from 'react';

/**
 * Column Schema
 *
 * Single column within a ColumnSet. Defines width behavior and contains items.
 * Can only exist as a child of ColumnSet.
 */
export const ColumnSchema = z.object({
  type: z.literal('Column'),
  items: z.array(z.any()), // Will be resolved by renderer recursively
  width: z.union([
    z.literal('auto'), // Width determined by content
    z.literal('stretch'), // Takes remaining space
    z.number().positive(), // Fixed weight ratio (e.g., 1, 2, 3)
  ]).default('auto'),
  verticalAlignment: z.enum(['top', 'center', 'bottom']).default('top'),
  spacing: z.enum(['none', 'small', 'default', 'large']).default('default'),
});

export type ColumnProps = z.infer<typeof ColumnSchema>;

const spacingMap = {
  none: 'gap-0',
  small: 'gap-2',
  default: 'gap-4',
  large: 'gap-6',
};

const alignmentMap = {
  top: 'justify-start',
  center: 'justify-center',
  bottom: 'justify-end',
};

interface ColumnComponentProps {
  width?: 'auto' | 'stretch' | number;
  verticalAlignment?: 'top' | 'center' | 'bottom';
  spacing?: 'none' | 'small' | 'default' | 'large';
  children: ReactNode;
}

export function Column({ width = 'auto', verticalAlignment = 'top', spacing = 'default', children }: ColumnComponentProps) {
  const widthClass = width === 'auto'
    ? 'flex-shrink-0'
    : width === 'stretch'
    ? 'flex-1'
    : '';

  const style = typeof width === 'number' ? { flex: width } : undefined;

  return (
    <div
      className={`flex flex-col ${widthClass} ${spacingMap[spacing as keyof typeof spacingMap]} ${alignmentMap[verticalAlignment as keyof typeof alignmentMap]}`}
      style={style}
    >
      {children}
    </div>
  );
}
