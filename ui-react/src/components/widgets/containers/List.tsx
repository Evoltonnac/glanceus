import { z } from 'zod';
import type { ReactNode } from 'react';

/**
 * List Schema
 *
 * Container for rendering arrays of data with filtering, sorting, and pagination.
 * Each item in the data array is rendered using the provided render template.
 */
export const ListSchema = z.object({
  type: z.literal('List'),
  data_source: z.string(), // Path to array in data context (e.g., "keys_list")
  item_alias: z.string(), // Alias for current item in render context (e.g., "key_item")
  render: z.array(z.any()), // Widget templates to render for each item

  // Layout options
  layout: z.enum(['col', 'grid']).default('col'),
  columns: z.number().min(1).max(6).optional(), // For grid layout
  spacing: z.enum(['none', 'small', 'default', 'large']).default('default'),

  // Data manipulation
  filter: z.string().optional(), // Expression like "key_item.active == true"
  sort_by: z.string().optional(), // Path like "key_item.usage"
  sort_order: z.enum(['asc', 'desc']).default('asc'),
  limit: z.number().positive().optional(),

  // Pagination
  pagination: z.boolean().default(false),
  page_size: z.number().positive().default(10),
});

export type ListProps = z.infer<typeof ListSchema>;

const spacingMap = {
  none: 'gap-0',
  small: 'gap-2',
  default: 'gap-4',
  large: 'gap-6',
};

interface ListComponentProps {
  layout?: 'col' | 'grid';
  columns?: number;
  spacing?: 'none' | 'small' | 'default' | 'large';
  children: ReactNode;
}

export function List({
  layout = 'col',
  columns = 2,
  spacing = 'default',
  children
}: ListComponentProps) {
  const spacingClass = spacingMap[spacing as keyof typeof spacingMap];

  if (layout === 'grid') {
    const gridColsMap: Record<number, string> = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5',
      6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-6',
    };

    return (
      <div className={`grid ${gridColsMap[columns] || gridColsMap[2]} ${spacingClass} w-full h-full content-start`}>
        {children}
      </div>
    );
  }

  // Column layout (vertical stack)
  return (
    <div className={`flex flex-col w-full h-full ${spacingClass}`}>
      {children}
    </div>
  );
}
