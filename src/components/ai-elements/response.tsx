'use client';

import { cn } from '@/lib/utils';
import { type ComponentProps, memo } from 'react';
import { Streamdown } from 'streamdown';

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        // Container and text defaults
        'size-full overflow-x-auto whitespace-pre-wrap break-words text-gray-800 leading-relaxed',
        // Trim outer spacing
        '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        // Table styling for better visibility
        '[&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-gray-300',
        '[&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold',
        '[&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2',
        '[&_tr:nth-child(even)]:bg-gray-50',
        // Code block styling
        '[&_pre]:bg-gray-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto',
        '[&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm',
        // List styling
        '[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6',
        '[&_li]:mb-1',
        // Heading styling
        '[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mb-3 [&_h1]:text-gray-900',
        '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-gray-900',
        '[&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-3 [&_h3]:mb-2 [&_h3]:text-gray-800',
        // Paragraph spacing
        '[&_p]:mb-2 [&_p]:leading-relaxed',
        // Links
        '[&_a]:text-blue-600 hover:[&_a]:underline [&_a]:underline-offset-2 [&_a]:break-words',
        // Blockquotes & HR
        '[&_blockquote]:border-l-4 [&_blockquote]:border-blue-200 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-700',
        '[&_hr]:my-4 [&_hr]:border-gray-200',
        // Images
        '[&_img]:max-w-full [&_img]:h-auto',
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = 'Response';
