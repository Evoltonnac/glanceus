import { z } from 'zod';

/**
 * TextBlock Schema
 *
 * Universal text component for all character-based information.
 * Handles everything from small muted annotations to large hero metrics.
 */
export const TextBlockSchema = z.object({
  type: z.literal('TextBlock'),
  text: z.union([z.string(), z.number(), z.boolean()]),
  size: z.enum(['small', 'default', 'large', 'xlarge', 'hero']).default('default'),
  weight: z.enum(['normal', 'medium', 'semibold', 'bold']).default('normal'),
  color: z.enum(['default', 'muted', 'good', 'warning', 'attention']).default('default'),
  wrap: z.boolean().default(true),
  maxLines: z.number().positive().optional(),
  max_lines: z.number().positive().optional(),
});

export type TextBlockProps = z.infer<typeof TextBlockSchema>;

const sizeMap = {
  small: 'text-xs',
  default: 'text-sm',
  large: 'text-base',
  xlarge: 'text-xl',
  hero: 'text-3xl',
};

const weightMap = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const colorMap = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  good: 'text-success',
  warning: 'text-warning',
  attention: 'text-error',
};

export function TextBlock({
  text,
  size = 'default',
  weight = 'normal',
  color = 'default',
  wrap = true,
  maxLines,
  max_lines,
}: TextBlockProps) {
  const resolvedMaxLines = maxLines ?? max_lines;
  const displayText = text === null || text === undefined ? '' : String(text);

  const shouldClampLines = typeof resolvedMaxLines === 'number' && resolvedMaxLines > 0;
  const wrapClass = shouldClampLines || wrap ? 'break-words' : 'whitespace-nowrap truncate';
  const clampStyle = shouldClampLines
    ? {
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical' as const,
        WebkitLineClamp: String(resolvedMaxLines),
        overflow: 'hidden',
      }
    : undefined;

  return (
    <div
      className={`${sizeMap[size as keyof typeof sizeMap]} ${weightMap[weight as keyof typeof weightMap]} ${colorMap[color as keyof typeof colorMap]} ${wrapClass}`}
      style={clampStyle}
    >
      {displayText}
    </div>
  );
}
