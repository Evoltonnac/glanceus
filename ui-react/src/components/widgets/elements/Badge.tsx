import { z } from 'zod';

/**
 * Badge Schema
 *
 * Semantic status indicator with predefined color palette.
 * Used to highlight discrete states like Active, Failed, Warning.
 */
export const BadgeSchema = z.object({
  type: z.literal('Badge'),
  text: z.union([z.string(), z.number()]),
  color: z.enum(['default', 'good', 'warning', 'attention', 'info']).default('default'),
});

export type BadgeProps = z.infer<typeof BadgeSchema>;

const colorMap = {
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  good: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  attention: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

export function Badge({ text, color = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorMap[color as keyof typeof colorMap]}`}>
      {text}
    </span>
  );
}
