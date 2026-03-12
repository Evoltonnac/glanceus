import { z } from 'zod';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

/**
 * Action.Copy Schema
 *
 * Button that copies text to clipboard with visual feedback.
 * Provides silent, lightweight clipboard interaction.
 */
export const ActionCopySchema = z.object({
  type: z.literal('Action.Copy'),
  title: z.string(),
  text: z.string(),
  style: z.enum(['default', 'primary', 'secondary']).default('default'),
});

export type ActionCopyProps = z.infer<typeof ActionCopySchema>;

const styleMap = {
  default: 'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100',
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-transparent hover:bg-gray-100 text-gray-700 dark:hover:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700',
};

export function ActionCopy({ title, text, style = 'default' }: ActionCopyProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${styleMap[style as keyof typeof styleMap]}`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied!' : title}
    </button>
  );
}
