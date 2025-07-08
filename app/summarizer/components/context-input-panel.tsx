"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Link, Loader2, FileText } from "lucide-react"
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
}: ContextInputPanelProps) {
  return (
    <Card className="border-gray-200 shadow-sm bg-white">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
          <FileText className="h-5 w-5 text-blue-600" />
          Context Input
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-xl h-12">
            <TabsTrigger
              value="text"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-gray-700 font-medium rounded-lg"
            >
              Text
            </TabsTrigger>
            <TabsTrigger
              value="file"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-gray-700 font-medium rounded-lg"
            >
              File
            </TabsTrigger>
            <TabsTrigger
              value="url"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-gray-700 font-medium rounded-lg"
            >
              URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 mt-6">
            <Textarea
              placeholder="Paste your content here for intelligent summarization..."
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              rows={8}
              className="resize-none border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
            />
            <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
              <span className="text-gray-500 font-medium">{getWordCount(content)} words</span>
              <span className="text-gray-500 font-medium">{content.length} characters</span>
            </div>
          </TabsContent>

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
                className="border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400 h-10"
              />
              <Button
                onClick={onUrlFetch}
                disabled={urlFetching || !url.trim()}
                variant="outline"
                className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 px-5 bg-white h-10"
              >
                {urlFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Enter a URL to automatically extract and summarize its content. Works best with article pages and blog
              posts.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
