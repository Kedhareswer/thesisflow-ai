"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Link, Loader2 } from "lucide-react"
import { FileUploader } from "../components/FileUploader"

interface ContextInputPanelProps {
  content: string
  url: string
  onContentChange: (content: string) => void
  onUrlChange: (url: string) => void
  onUrlFetch: () => void
  onFileProcessed: (content: string, metadata: any) => void
  onFileError: (error: string) => void
  urlFetching: boolean
  getWordCount: (text: string) => number
  currentTab: "file" | "url" | "text"
  onTabChange: (tab: "file" | "url" | "text") => void
}

export function ContextInputPanel({
  content,
  url,
  onContentChange,
  onUrlChange,
  onUrlFetch,
  onFileProcessed,
  onFileError,
  urlFetching,
  getWordCount,
  currentTab,
  onTabChange,
}: ContextInputPanelProps) {
  return (
    <div>
      <h3 className="text-xl font-light text-black mb-4 tracking-tight">Content Input</h3>
      <Card className="border-gray-200 bg-white">
        <CardContent className="p-6">
          <Tabs value={currentTab} onValueChange={(value) => onTabChange(value as "file" | "url" | "text")} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-0.5 rounded-sm h-10">
              <TabsTrigger
                value="file"
                className="data-[state=active]:bg-white data-[state=active]:shadow-none text-gray-700 font-light rounded-sm data-[state=active]:text-black"
              >
                File
              </TabsTrigger>
              <TabsTrigger
                value="url"
                className="data-[state=active]:bg-white data-[state=active]:shadow-none text-gray-700 font-light rounded-sm data-[state=active]:text-black"
              >
                URL
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="data-[state=active]:bg-white data-[state=active]:shadow-none text-gray-700 font-light rounded-sm data-[state=active]:text-black"
              >
                Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-4 mt-6">
              <FileUploader onFileProcessed={onFileProcessed} onError={onFileError} />
            </TabsContent>

            <TabsContent value="url" className="space-y-4 mt-6">
              <div className="flex gap-3">
                <Input
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => onUrlChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !urlFetching && onUrlFetch()}
                  className="border-gray-200 focus:border-black focus:ring-1 focus:ring-black text-gray-900 placeholder:text-gray-400 h-10 font-light"
                />
                <Button
                  onClick={onUrlFetch}
                  disabled={urlFetching || !url.trim()}
                  variant="outline"
                  className="border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 px-5 bg-white h-10 font-light"
                >
                  {urlFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600 font-light">
                  Enter a URL to automatically extract and summarize its content.
                </p>
                <div className="text-xs text-gray-500 bg-gray-50 rounded-sm p-3 border border-gray-200">
                  <p className="font-medium text-gray-700 mb-1">Note about URL extraction:</p>
                  <p>Some websites (especially news sites like BBC, CNN, NYTimes) may block automated content extraction. If extraction fails, try:</p>
                  <ul className="mt-1 space-y-0.5 ml-3">
                    <li>• Copying the content directly from your browser</li>
                    <li>• Using archive.org to find archived versions</li>
                    <li>• Looking for RSS feeds from the same source</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-4 mt-6">
              <div className="space-y-3">
                <Textarea
                  placeholder="Paste your text content here to summarize..."
                  value={content}
                  onChange={(e) => onContentChange(e.target.value)}
                  className="min-h-[200px] border-gray-200 focus:border-black focus:ring-1 focus:ring-black text-gray-900 placeholder:text-gray-400 font-light resize-y"
                />
                {content && (
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{getWordCount(content)} words</span>
                    <span>~{Math.ceil(getWordCount(content) / 200)} min read</span>
                  </div>
                )}
                <p className="text-sm text-gray-600 font-light">
                  Paste text content directly for summarization. This is useful when URL extraction fails or for content from restricted websites.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
