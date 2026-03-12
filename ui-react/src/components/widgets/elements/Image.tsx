import { z } from 'zod';

/**
 * Image Schema
 *
 * Universal image/icon rendering component.
 * Supports URLs and integration-specific icon identifiers.
 */
export const ImageSchema = z.object({
  type: z.literal('Image'),
  url: z.string(),
  altText: z.string().default(''),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  style: z.enum(['default', 'avatar']).default('default'),
});

export type ImageProps = z.infer<typeof ImageSchema>;

const sizeMap = {
  small: 'w-6 h-6',
  medium: 'w-10 h-10',
  large: 'w-16 h-16',
};

export function Image({ url, altText = '', size = 'medium', style = 'default' }: ImageProps) {
  const roundedClass = style === 'avatar' ? 'rounded-full' : 'rounded';

  return (
    <img
      src={url}
      alt={altText}
      className={`${sizeMap[size as keyof typeof sizeMap]} ${roundedClass} object-cover`}
      onError={(e) => {
        // Fallback to placeholder on error
        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Crect width="24" height="24" fill="%23e5e7eb"/%3E%3C/svg%3E';
      }}
    />
  );
}
