"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  FileText, 
  Brain, 
  BookOpen, 
  Lightbulb,
  Calendar,
  Info,
  Settings
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useResearchSession } from './research-session-provider'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface ResearchSessionManagerProps {
  className?: string
}

export function ResearchSessionManager({ className }: ResearchSessionManagerProps) {
  const { toast } = useToast()
  const { 
    session, 
    createNewSession, 
    updateSessionMeta, 
    clearSession, 
    exportSession, 
    importSession 
  } = useResearchSession()
  
  const [sessionName, setSessionName] = useState(() => session.name)
  const [currentTopic, setCurrentTopic] = useState(() => session.currentTopic || '')
  const [currentObjective, setCurrentObjective] = useState(() => session.currentObjective || '')
  const [importData, setImportData] = useState('')
  const [showImportDialog, setShowImportDialog] = useState(false)

  // Update form fields when session changes, but only if different
  useEffect(() => {
    if (session.name !== sessionName) {
      setSessionName(session.name)
    }
    if ((session.currentTopic || '') !== currentTopic) {
      setCurrentTopic(session.currentTopic || '')
    }
    if ((session.currentObjective || '') !== currentObjective) {
      setCurrentObjective(session.currentObjective || '')
    }
  }, [session.name, session.currentTopic, session.currentObjective])

  const handleUpdateSession = () => {
    updateSessionMeta({
      name: sessionName || 'Research Session',
      currentTopic: currentTopic || undefined,
      currentObjective: currentObjective || undefined
    })
    
    toast({
      title: "Session Updated",
      description: "Research session metadata has been updated."
    })
  }

  const handleExportSession = () => {
    try {
      const data = exportSession()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `research-session-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Session Exported",
        description: "Research session has been exported successfully."
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export research session.",
        variant: "destructive"
      })
    }
  }

  const handleImportSession = () => {
    try {
      if (!importData.trim()) {
        toast({
          title: "Import Failed",
          description: "Please provide session data to import.",
          variant: "destructive"
        })
        return
      }

      const success = importSession(importData)
      if (success) {
        setImportData('')
        setShowImportDialog(false)
        toast({
          title: "Session Imported",
          description: "Research session has been imported successfully."
        })
      } else {
        toast({
          title: "Import Failed",
          description: "Invalid session data format.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import research session.",
        variant: "destructive"
      })
    }
  }

  const handleClearSession = () => {
    if (confirm('Are you sure you want to clear all session data? This action cannot be undone.\n\nNote: This will only clear your research session data (papers, topics, ideas, chat history) and will NOT affect your plan usage or limits.')) {
      try {
        // Only clear local session data - NEVER call any APIs that might reset usage
        clearSession()
        setSessionName('Research Session')
        setCurrentTopic('')
        setCurrentObjective('')
        
        toast({
          title: "Session Cleared",
          description: "Research session data cleared. Your plan usage remains unchanged.",
        })
      } catch (error) {
        console.error('Error clearing session:', error)
        toast({
          title: "Clear Failed",
          description: "Failed to clear session data. Please try again.",
          variant: "destructive"
        })
      }
    }
  }

  const handleNewSession = () => {
    if (confirm('Create a new session? Current session data will be cleared.')) {
      createNewSession('New Research Session')
      setSessionName('New Research Session')
      setCurrentTopic('')
      setCurrentObjective('')
      
      toast({
        title: "New Session Created",
        description: "A new research session has been created."
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSessionStats = () => {
    return {
      papers: session.papers.length,
      selectedPapers: session.selectedPapers.length,
      ideas: session.ideas.length,
      selectedIdeas: session.selectedIdeas.length,
      topics: session.topics.length,
      searches: session.searchSessions.length,
      messages: session.chatHistory.length
    }
  }

  const stats = getSessionStats()

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Research Session Manager
          </CardTitle>
          <CardDescription>
            Manage your research session data, settings, and export/import functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Session Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Session Information</h3>
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(session.updatedAt)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Session Name</label>
                <Input
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Enter session name..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Current Topic</label>
                <Input
                  value={currentTopic}
                  onChange={(e) => setCurrentTopic(e.target.value)}
                  placeholder="Main research topic..."
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Research Objective</label>
              <Textarea
                value={currentObjective}
                onChange={(e) => setCurrentObjective(e.target.value)}
                placeholder="Describe your research objective or goal..."
                rows={3}
              />
            </div>
            
            <Button onClick={handleUpdateSession} className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Update Session
            </Button>
          </div>

          <Separator />

          {/* Session Statistics */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Session Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-blue-600">{stats.papers}</div>
                <div className="text-sm text-gray-600">{stats.selectedPapers} selected</div>
                <div className="text-xs text-gray-500">Papers</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <Lightbulb className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-yellow-600">{stats.ideas}</div>
                <div className="text-sm text-gray-600">{stats.selectedIdeas} selected</div>
                <div className="text-xs text-gray-500">Ideas</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Brain className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-600">{stats.topics}</div>
                <div className="text-sm text-gray-600">{stats.searches} searches</div>
                <div className="text-xs text-gray-500">Topics</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-purple-600">{stats.messages}</div>
                <div className="text-sm text-gray-600">Chat history</div>
                <div className="text-xs text-gray-500">Messages</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Session Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Session Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button onClick={handleExportSession} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Session
              </Button>
              
              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Session
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Research Session</DialogTitle>
                    <DialogDescription>
                      Paste your exported session data below to import it. This will replace your current session.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      value={importData}
                      onChange={(e) => setImportData(e.target.value)}
                      placeholder="Paste exported session JSON data here..."
                      rows={10}
                      className="font-mono text-sm"
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowImportDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleImportSession}>
                        Import Session
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button onClick={handleNewSession} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                New Session
              </Button>
              
              <Button 
                onClick={handleClearSession} 
                variant="destructive" 
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Session
              </Button>
            </div>
          </div>

          {/* Session Details */}
          {(stats.papers > 0 || stats.ideas > 0 || stats.topics > 0) && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Session Overview</h3>
                
                {session.currentTopic && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Current Focus:</strong> {session.currentTopic}
                      {session.currentObjective && (
                        <>
                          <br />
                          <strong>Objective:</strong> {session.currentObjective}
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {stats.topics > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recent Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {session.topics.slice(0, 5).map((topic) => (
                        <Badge key={topic.id} variant="secondary" className="text-xs">
                          {topic.name}
                        </Badge>
                      ))}
                      {session.topics.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{session.topics.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {session.searchSessions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recent Searches</h4>
                    <div className="space-y-1">
                      {session.searchSessions.slice(-3).map((search) => (
                        <div key={search.id} className="text-sm text-gray-600">
                          "{search.query}" ({search.resultsCount} results)
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
