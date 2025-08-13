"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { AIProvider } from "@/lib/ai-providers"
import MinimalAIProviderSelector from "@/components/ai-provider-selector-minimal"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { useState } from "react"

interface ConfigurationPanelProps {
  selectedProvider: AIProvider | undefined
  onProviderChange: (provider: AIProvider | undefined) => void
  selectedModel?: string
  onModelChange?: (model: string | undefined) => void
  summaryStyle: "academic" | "executive" | "bullet-points" | "detailed"
  onSummaryStyleChange: (style: "academic" | "executive" | "bullet-points" | "detailed") => void
  summaryLength: "brief" | "medium" | "comprehensive"
  onSummaryLengthChange: (length: "brief" | "medium" | "comprehensive") => void
}

export function ConfigurationPanel({
  selectedProvider,
  onProviderChange,
  selectedModel,
  onModelChange,
  summaryStyle,
  onSummaryStyleChange,
  summaryLength,
  onSummaryLengthChange,
}: ConfigurationPanelProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* AI Provider Selector */}
      <MinimalAIProviderSelector
        selectedProvider={selectedProvider}
        onProviderChange={onProviderChange}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        variant="inline"
        showModelSelector={true}
        showConfigLink={false}
        className="mb-4"
      />

      {/* Provider Impact Indicator */}
      {selectedProvider && (
        <div className="mb-4 p-3 bg-blue-50 rounded-sm border border-blue-200">
          <p className="text-sm text-blue-800 font-light">
            <span className="font-medium">Using {selectedProvider}:</span>
            {selectedProvider === "groq" && " Fast, efficient summaries with high accuracy"}
            {selectedProvider === "openai" && " Advanced reasoning and detailed analysis"}
            {selectedProvider === "gemini" && " Balanced analysis with comprehensive coverage"}
            {selectedProvider === "anthropic" && " High-quality reasoning and detailed insights"}
            {selectedProvider === "mistral" && " Fast and efficient AI processing"}
            {selectedProvider === "aiml" && " Specialized AI analysis and insights"}

          </p>
        </div>
      )}

      {/* Advanced Options */}
      <div>
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
            <h3 className="text-xl font-light text-black tracking-tight">Advanced Options</h3>
            <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <Card className="border-gray-200 bg-white">
              <CardContent className="p-6 space-y-4">
                {/* Current Settings Indicator */}
                <div className="mb-4 p-3 bg-gray-50 rounded-sm">
                  <p className="text-sm text-gray-600 font-light">
                    <span className="font-medium text-black">Current Settings:</span> {summaryStyle} • {summaryLength}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {summaryStyle === "academic" && "Formal, scholarly analysis with citations"}
                    {summaryStyle === "executive" && "Business-focused with strategic insights"}
                    {summaryStyle === "bullet-points" && "Structured bullet-point format"}
                    {summaryStyle === "detailed" && "Comprehensive analysis with deep insights"}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-light text-gray-700 mb-2 block">Summary Style</Label>
                  <Select value={summaryStyle} onValueChange={onSummaryStyleChange}>
                    <SelectTrigger className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black h-10 bg-white font-light">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="academic" className="hover:bg-gray-50 font-light">
                        Academic
                      </SelectItem>
                      <SelectItem value="executive" className="hover:bg-gray-50 font-light">
                        Executive
                      </SelectItem>
                      <SelectItem value="bullet-points" className="hover:bg-gray-50 font-light">
                        Bullet Points
                      </SelectItem>
                      <SelectItem value="detailed" className="hover:bg-gray-50 font-light">
                        Detailed
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-light text-gray-700 mb-2 block">Summary Length</Label>
                  <Select value={summaryLength} onValueChange={onSummaryLengthChange}>
                    <SelectTrigger className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black h-10 bg-white font-light">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="brief" className="hover:bg-gray-50 font-light">
                        Brief
                      </SelectItem>
                      <SelectItem value="medium" className="hover:bg-gray-50 font-light">
                        Medium
                      </SelectItem>
                      <SelectItem value="comprehensive" className="hover:bg-gray-50 font-light">
                        Comprehensive
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}
