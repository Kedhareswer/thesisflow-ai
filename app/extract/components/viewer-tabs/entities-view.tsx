/**
 * Extract Data v2 - Entities View Tab
 * Phase 0: Renders entity chips from extractedData.entities
 */

import React, { useState } from 'react';

interface Entity {
  type: 'person' | 'organization' | 'location' | 'date' | 'email' | 'url' | 'number';
  value: string;
  count: number;
}

interface EntitiesViewProps {
  entities?: Entity[];
}

export function EntitiesView({ entities = [] }: EntitiesViewProps) {
  const [showEntities, setShowEntities] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');

  if (entities.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium">No Entities Found</div>
          <div className="mt-1 text-sm">Entities will appear here after document processing.</div>
        </div>
      </div>
    );
  }

  // Group entities by type
  const entityTypes = Array.from(new Set(entities.map(e => e.type)));
  const filteredEntities = selectedType === 'all' 
    ? entities 
    : entities.filter(e => e.type === selectedType);

  // Get type counts
  const typeCounts = entityTypes.reduce((acc, type) => {
    acc[type] = entities.filter(e => e.type === type).length;
    return acc;
  }, {} as Record<string, number>);

  const getTypeColor = (type: string) => {
    const colors = {
      person: 'bg-blue-50 text-blue-700 ring-blue-200',
      organization: 'bg-green-50 text-green-700 ring-green-200',
      location: 'bg-purple-50 text-purple-700 ring-purple-200',
      date: 'bg-orange-50 text-orange-700 ring-orange-200',
      email: 'bg-pink-50 text-pink-700 ring-pink-200',
      url: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
      number: 'bg-gray-50 text-gray-700 ring-gray-200',
    };
    return colors[type as keyof typeof colors] || colors.number;
  };

  return (
    <div className="h-full overflow-auto bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Extracted Entities ({entities.length})
        </h3>
        <button
          onClick={() => setShowEntities(s => !s)}
          className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          aria-expanded={showEntities}
        >
          {showEntities ? 'Hide' : 'Show'}
        </button>
      </div>

      {showEntities && (
        <div className="space-y-4">
          {/* Type Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedType('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedType === 'all'
                  ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({entities.length})
            </button>
            {entityTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)} ({typeCounts[type]})
              </button>
            ))}
          </div>

          {/* Entities Grid */}
          <div className="grid gap-2">
            {filteredEntities.map((entity, index) => (
              <div
                key={`${entity.type}-${entity.value}-${index}`}
                className={`inline-flex items-center justify-between rounded-lg px-3 py-2 text-sm ring-1 ${getTypeColor(entity.type)}`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-medium capitalize">{entity.type}</span>
                  <span className="text-gray-500">•</span>
                  <span className="truncate" title={entity.value}>
                    {entity.value}
                  </span>
                </div>
                {entity.count > 1 && (
                  <span className="ml-2 rounded bg-white/50 px-1.5 py-0.5 text-xs font-medium">
                    {entity.count}
                  </span>
                )}
              </div>
            ))}
          </div>

          {filteredEntities.length === 0 && selectedType !== 'all' && (
            <div className="text-center text-gray-500 py-8">
              No {selectedType} entities found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
