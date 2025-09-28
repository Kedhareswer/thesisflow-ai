/**
 * Extract Data v2 - Tables View Tab
 * Phase 0: Renders table list + CSV/JSON export (reuses existing export functions)
 */

import React, { useState } from 'react';

interface Table {
  id?: string;
  headers: string[];
  rows: string[][];
}

interface TablesViewProps {
  tables?: Table[];
  onExportCSV: (tables: Table[]) => void;
  onExportJSON: (tables: Table[]) => void;
}

export function TablesView({ tables = [], onExportCSV, onExportJSON }: TablesViewProps) {
  const [showTables, setShowTables] = useState(true);

  if (tables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium">No Tables Found</div>
          <div className="mt-1 text-sm">Tables will appear here after document processing.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Extracted Tables ({tables.length})
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onExportCSV(tables)}
            className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => onExportJSON(tables)}
            className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Export JSON
          </button>
          <button
            onClick={() => setShowTables(s => !s)}
            className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            aria-expanded={showTables}
          >
            {showTables ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {showTables && (
        <div className="space-y-6">
          {tables.map((table, index) => (
            <div key={table.id || index} className="overflow-hidden rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
                <h4 className="text-sm font-medium text-gray-900">
                  Table {index + 1}
                  {table.headers.length > 0 && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({table.headers.length} columns, {table.rows.length} rows)
                    </span>
                  )}
                </h4>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  {table.headers.length > 0 && (
                    <thead className="bg-gray-50">
                      <tr>
                        {table.headers.map((header, headerIndex) => (
                          <th
                            key={headerIndex}
                            className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="whitespace-nowrap px-4 py-3 text-sm text-gray-900"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {table.rows.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  No data rows found in this table.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
