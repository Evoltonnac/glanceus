import { z } from 'zod';

/**
 * FactSet Schema
 *
 * Structured key-value information display.
 * Used for presenting metadata like account details, billing info, etc.
 */
export const FactSchema = z.object({
  label: z.union([z.string(), z.number()]),
  value: z.union([z.string(), z.number()]),
});

export const FactSetSchema = z.object({
  type: z.literal('FactSet'),
  facts: z.array(FactSchema),
  spacing: z.enum(['compact', 'default', 'relaxed']).default('default'),
});

export type FactSetProps = z.infer<typeof FactSetSchema>;

const spacingMap = {
  compact: 'gap-1',
  default: 'gap-2',
  relaxed: 'gap-3',
};

export function FactSet({ facts, spacing = 'default' }: FactSetProps) {
  return (
    <div className={`flex flex-col ${spacingMap[spacing as keyof typeof spacingMap]}`}>
      {facts.map((fact: { label: string | number; value: string | number }, index: number) => (
        <div key={index} className="flex justify-between items-baseline gap-4">
          <span className="text-sm text-muted-foreground shrink-0">{fact.label}:</span>
          <span className="text-sm font-medium text-foreground text-right truncate">{fact.value}</span>
        </div>
      ))}
    </div>
  );
}
