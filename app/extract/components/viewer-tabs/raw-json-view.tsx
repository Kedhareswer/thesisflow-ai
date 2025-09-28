/**
 * Extract Data v2 - Raw JSON View Tab
 * Phase 0: JSON.stringify(extractedData) with copy functionality
 */

import React, { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';

interface RawJsonViewProps {
  extractedData?: any;
  filename?: string;
}

export function RawJsonView({ extractedData, filename }: RawJsonViewProps) {
  const [copied, setCopied] = useState(false);

  const jsonString = extractedData 
    ? JSON.stringify(extractedData, null, 2)
    : '{}';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename || 'extraction'}-raw.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!extractedData) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium">No Data Available</div>
          <div className="mt-1 text-sm">Raw JSON data will appear here after processing.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Raw JSON Data</h3>
          <p className="text-sm text-gray-600">Complete extraction results in JSON format</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>

      {/* JSON Content */}
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
          {jsonString}
        </pre>
      </div>

      {/* Footer Stats */}
      <div className="border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
        {jsonString.length.toLocaleString()} characters • {jsonString.split('\n').length} lines
      </div>
    </div>
  );
}
