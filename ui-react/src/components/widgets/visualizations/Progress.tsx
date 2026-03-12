import { z } from 'zod';

/**
 * Progress Schema
 *
 * Visual representation of resource consumption, quota usage, or completion percentage.
 * Supports both horizontal bar and circular ring styles with automatic color thresholds.
 */
export const ProgressSchema = z.object({
  type: z.literal('Progress'),
  // Template evaluation currently returns strings; coerce for runtime safety.
  value: z.coerce.number().min(0).max(100),
  label: z.union([z.string(), z.number()]).optional(),
  style: z.enum(['bar', 'ring']).default('bar'),
  color: z.enum(['default', 'good', 'warning', 'attention']).optional(),
  showPercentage: z.boolean().default(true),
  thresholds: z.object({
    warning: z.coerce.number().min(0).max(100).default(70),
    attention: z.coerce.number().min(0).max(100).default(90),
  }).optional(),
});

export type ProgressProps = z.infer<typeof ProgressSchema>;

const colorMap = {
  default: 'bg-blue-500',
  good: 'bg-green-500',
  warning: 'bg-yellow-500',
  attention: 'bg-red-500',
};

function getAutoColor(value: number, thresholds?: { warning: number; attention: number }): string {
  if (!thresholds) return colorMap.default;
  if (value >= thresholds.attention) return colorMap.attention;
  if (value >= thresholds.warning) return colorMap.warning;
  return colorMap.good;
}

export function Progress({
  value,
  label,
  style = 'bar',
  color,
  showPercentage = true,
  thresholds,
}: ProgressProps) {
  const progressColor = color ? colorMap[color as keyof typeof colorMap] : getAutoColor(value, thresholds);

  if (style === 'ring') {
    // Circular progress ring (similar to Vercel style)
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200 dark:text-gray-800"
            />
            {/* Progress circle */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={progressColor.replace('bg-', 'text-')}
            />
          </svg>
          {showPercentage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-semibold">{value}%</span>
            </div>
          )}
        </div>
        {label && <span className="text-sm text-muted-foreground">{label}</span>}
      </div>
    );
  }

  // Horizontal bar style
  return (
    <div className="flex flex-col gap-1 w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-baseline">
          {label && <span className="text-sm text-muted-foreground">{label}</span>}
          {showPercentage && <span className="text-sm font-medium">{value}%</span>}
        </div>
      )}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${progressColor} transition-all duration-300`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
