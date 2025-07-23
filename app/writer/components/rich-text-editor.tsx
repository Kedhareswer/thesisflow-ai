import dynamic from 'next/dynamic';
import React from 'react';
import MarkdownPreview from '@uiw/react-markdown-preview';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function MarkdownEditor({ value, onChange, className }: MarkdownEditorProps) {
  return (
    <div className={className} data-color-mode="light">
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <MDEditor
            value={value}
            onChange={v => onChange(v || '')}
            height={500}
            preview="edit"
          />
        </div>
        <div style={{ flex: 1, background: '#f9f9f9', borderRadius: 8, padding: 16, minHeight: 500, overflow: 'auto' }}>
          <MarkdownPreview source={value} rehypePlugins={[rehypeKatex]} />
        </div>
      </div>
    </div>
  );
}

export default MarkdownEditor;
