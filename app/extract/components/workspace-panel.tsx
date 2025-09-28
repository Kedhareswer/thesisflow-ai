/**
 * Extract Data v2 - Workspace Panel (Left Column)
 * Phase 0: Upload, Recent files, filters UI (reuses existing functions)
 */

import React, { useState, useRef } from 'react';
import { Upload, FileText, Search, Grid, List, Plus, Trash2 } from 'lucide-react';
import { RecentExtraction } from '@/lib/services/extractions-store';

interface WorkspacePanelProps {
  selectedFiles: File[];
  recentExtractions: RecentExtraction[];
  isUploading: boolean;
  uploadProgress: number;
  onFileSelect: (files: FileList) => void;
  onFileRemove: (index: number) => void;
  onRecentSelect: (id: string) => void;
  onRecentDelete: (id: string) => void;
  onClearAll: () => void;
  onRefreshRecent: () => void;
  supportedExtensions: string[];
}

export function WorkspacePanel({
  selectedFiles,
  recentExtractions,
  isUploading,
  uploadProgress,
  onFileSelect,
  onFileRemove,
  onRecentSelect,
  onRecentDelete,
  onClearAll,
  onRefreshRecent,
  supportedExtensions,
}: WorkspacePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      onFileSelect(e.dataTransfer.files);
    }
  };

  const filteredRecent = recentExtractions.filter(item =>
    item.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.summary && item.summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Associated Files</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Upload Area */}
      <div className="p-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-md border-2 border-dashed p-6 text-center transition-colors ${
            isDragOver ? 'border-orange-300 bg-orange-50' : 'border-gray-300 bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={supportedExtensions.length ? supportedExtensions.map(ext => `.${ext}`).join(',') : '.pdf'}
            onChange={(e) => e.target.files && onFileSelect(e.target.files)}
            className="hidden"
          />
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
            <FileText className="h-6 w-6 text-gray-500" />
          </div>
          <div className="text-sm text-gray-700">Drag files here or</div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 inline-flex items-center gap-2 rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Add Files
          </button>
          <div className="mt-1 text-xs text-gray-400">Max. 10 MB per file</div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Uploading...</span>
              <span className="text-sm text-gray-500">{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div 
                className="h-2 rounded-full bg-orange-500 transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }} 
              />
            </div>
          </div>
        )}

        {/* Selected Files */}
        {selectedFiles.length > 0 && !isUploading && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-gray-900">Selected Files</h3>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onFileRemove(index)} 
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="border-t border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
      </div>

      {/* Recent Files */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between border-t border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Recent Files ({filteredRecent.length})
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={onRefreshRecent} 
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Refresh
            </button>
            <button 
              onClick={onClearAll} 
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filteredRecent.length === 0 ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
              {searchQuery ? 'No files match your search.' : 'No recent files yet.'}
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-2' : 'space-y-2'}>
              {filteredRecent.map((item) => (
                <div
                  key={item.id}
                  className="group relative cursor-pointer rounded-md border border-gray-200 bg-white p-3 hover:bg-gray-50"
                  onClick={() => onRecentSelect(item.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-900" title={item.file_name}>
                          {item.file_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.file_type || 'file'} • {formatFileSize(item.file_size)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-xs text-gray-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onRecentDelete(item.id); 
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {item.summary && (
                    <p className="mt-2 line-clamp-2 text-xs text-gray-700">
                      {item.summary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
