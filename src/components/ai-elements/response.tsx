'use client';

import { cn } from '@/lib/utils';
import { type ComponentProps, memo } from 'react';
import { Streamdown } from 'streamdown';

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
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
        '[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-4',
        '[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-3',
        '[&_h3]:text-base [&_h3]:font-medium [&_h3]:mb-2',
        // Paragraph spacing
        '[&_p]:mb-3 [&_p]:leading-relaxed',
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = 'Response';
