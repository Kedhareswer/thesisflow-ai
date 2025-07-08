"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Settings } from "lucide-react"
import type { AIProvider } from "@/lib/ai-providers"
import MinimalAIProviderSelector from "@/components/ai-provider-selector-minimal"
import { Accordion, AccordionItem, AccordionTrigger, AccordionPanel } from '@/components/animate-ui/base/accordion'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/animate-ui/base/popover'
import { Info } from 'lucide-react'

interface ConfigurationPanelProps {
  selectedProvider: AIProvider | undefined
  onProviderChange: (provider: AIProvider) => void
  selectedModel?: string
  onModelChange?: (model: string) => void
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
  return (
    <div className="space-y-6">
      {/* AI Provider Selector - Compact variant for Summarizer */}
      <MinimalAIProviderSelector
        selectedProvider={selectedProvider}
        onProviderChange={onProviderChange}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        variant="compact"
        showModelSelector={true}
        showConfigLink={true}
      />

      {/* Advanced Options Accordion */}
      <Accordion>
        <AccordionItem value="advanced-options">
          <AccordionTrigger className="text-lg font-medium text-gray-900 px-6 py-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600 mr-2" /> Advanced Options
            <Popover>
              <PopoverTrigger>
                <Info className="h-4 w-4 text-gray-400 hover:text-black transition" aria-label="About advanced options" />
              </PopoverTrigger>
              <PopoverContent side="top" className="text-xs max-w-xs bg-white border border-gray-200 shadow-md">
                Advanced options let you customize the summary style and length. Most users can leave these as default for best results.
              </PopoverContent>
            </Popover>
          </AccordionTrigger>
          <AccordionPanel className="px-0 pb-0">
            <Card className="border-gray-200 shadow-sm bg-white border-0">
              <CardContent className="grid gap-4 md:grid-cols-2 p-6">
                <div>
                  <Label className="text-sm font-medium mb-2 block text-gray-700">Summary Style</Label>
                  <Select value={summaryStyle} onValueChange={onSummaryStyleChange}>
                    <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="academic" className="hover:bg-gray-50">
                        Academic
                      </SelectItem>
                      <SelectItem value="executive" className="hover:bg-gray-50">
                        Executive
                      </SelectItem>
                      <SelectItem value="bullet-points" className="hover:bg-gray-50">
                        Bullet Points
                      </SelectItem>
                      <SelectItem value="detailed" className="hover:bg-gray-50">
                        Detailed
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block text-gray-700">Summary Length</Label>
                  <Select value={summaryLength} onValueChange={onSummaryLengthChange}>
                    <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="brief" className="hover:bg-gray-50">
                        Brief
                      </SelectItem>
                      <SelectItem value="medium" className="hover:bg-gray-50">
                        Medium
                      </SelectItem>
                      <SelectItem value="comprehensive" className="hover:bg-gray-50">
                        Comprehensive
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
