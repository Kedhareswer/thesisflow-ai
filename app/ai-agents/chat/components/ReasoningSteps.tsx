"use client"

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Search, BarChart3, Brain, CheckCircle, Loader2, Clock, FileText } from 'lucide-react'

interface ReasoningStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'active' | 'completed' | 'error'
  details?: string[]
  sources?: { name: string; count: number }[]
  duration?: string
  progress?: number
}

interface ReasoningStepsProps {
  steps: ReasoningStep[]
  isComplete: boolean
  className?: string
}

const getStepIcon = (step: ReasoningStep) => {
  switch (step.status) {
    case 'active':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'error':
      return <div className="h-4 w-4 rounded-full bg-red-100 border-2 border-red-300" />
    default:
      return <div className="h-4 w-4 rounded-full bg-gray-200 border-2 border-gray-300" />
  }
}

const getStepBgColor = (step: ReasoningStep, isExpanded: boolean) => {
  switch (step.status) {
    case 'active':
      return isExpanded ? 'bg-blue-50 border-blue-200' : 'bg-blue-25 border-blue-100'
    case 'completed':
      return isExpanded ? 'bg-green-50 border-green-200' : 'bg-green-25 border-green-100'
    case 'error':
      return isExpanded ? 'bg-red-50 border-red-200' : 'bg-red-25 border-red-100'
    default:
      return isExpanded ? 'bg-gray-50 border-gray-200' : 'bg-gray-25 border-gray-100'
  }
}

export default function ReasoningSteps({ steps, isComplete, className = '' }: ReasoningStepsProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev)
      if (newSet.has(stepId)) {
        newSet.delete(stepId)
      } else {
        newSet.add(stepId)
      }
      return newSet
    })
  }

  const expandAll = () => {
    setExpandedSteps(new Set(steps.map(s => s.id)))
    setShowAll(true)
  }

  const collapseAll = () => {
    setExpandedSteps(new Set())
    setShowAll(false)
  }

  const completedSteps = steps.filter(s => s.status === 'completed').length
  const totalSteps = steps.length

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-purple-600" />
            <div>
              <h3 className="font-medium text-gray-900">Research Process</h3>
              <p className="text-sm text-gray-500">
                {isComplete 
                  ? `Completed ${completedSteps}/${totalSteps} steps`
                  : `Running ${completedSteps}/${totalSteps} steps...`
                }
              </p>
            </div>
          </div>
          
          {/* Expand/Collapse Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={showAll ? collapseAll : expandAll}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showAll ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>

        {/* Overall Progress */}
        {!isComplete && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="divide-y divide-gray-100">
        {steps.map((step, index) => {
          const isExpanded = expandedSteps.has(step.id)
          
          return (
            <div key={step.id}>
              {/* Step Header */}
              <button
                onClick={() => toggleStep(step.id)}
                className={`w-full p-4 text-left transition-all duration-200 hover:bg-gray-25 ${
                  getStepBgColor(step, isExpanded)
                }`}
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    {/* Step Icon */}
                    {getStepIcon(step)}
                    
                    {/* Step Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{step.title}</span>
                        {step.duration && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {step.duration}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{step.description}</p>
                      
                      {/* Progress bar for active steps */}
                      {step.status === 'active' && step.progress !== undefined && (
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${step.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expand/Collapse Icon */}
                  <div className="transition-transform duration-200">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* Step Details */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="px-4 pb-4">
                  <div className="ml-7 space-y-3">
                    {/* Sources */}
                    {step.sources && step.sources.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-2">Sources Found:</p>
                        <div className="flex flex-wrap gap-2">
                          {step.sources.map((source, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-xs rounded-md"
                            >
                              <FileText className="h-3 w-3" />
                              <span className="font-medium">{source.name}:</span>
                              <span className="text-gray-600">{source.count}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Details */}
                    {step.details && step.details.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-2">Details:</p>
                        <ul className="space-y-1">
                          {step.details.map((detail, idx) => (
                            <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                              <span className="text-gray-400 mt-0.5">•</span>
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {isComplete && (
        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">Research completed successfully</span>
          </div>
        </div>
      )}
    </div>
  )
}
