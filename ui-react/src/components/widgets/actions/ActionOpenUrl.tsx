import { z } from 'zod';
import { ExternalLink } from 'lucide-react';
import { openExternalLink } from '../../../lib/utils';

/**
 * Action.OpenUrl Schema
 *
 * Button that opens an external URL in the default browser.
 * Provides clear visual indication of external navigation.
 */
export const ActionOpenUrlSchema = z.object({
  type: z.literal('Action.OpenUrl'),
  title: z.string(),
  url: z.string().url(),
  style: z.enum(['default', 'primary', 'secondary']).default('default'),
  iconPosition: z.enum(['left', 'right', 'none']).default('right'),
});

export type ActionOpenUrlProps = z.infer<typeof ActionOpenUrlSchema>;

const styleMap = {
  default: 'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100',
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-transparent hover:bg-gray-100 text-gray-700 dark:hover:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700',
};

export function ActionOpenUrl({
  title,
  url,
  style = 'default',
  iconPosition = 'right',
}: ActionOpenUrlProps) {
  const handleClick = () => {
    openExternalLink(url);
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${styleMap[style as keyof typeof styleMap]}`}
    >
      {iconPosition === 'left' && <ExternalLink className="w-4 h-4" />}
      {title}
      {iconPosition === 'right' && <ExternalLink className="w-4 h-4" />}
    </button>
  );
}
