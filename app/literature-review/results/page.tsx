"use client"

import React from "react"
import { useRouter } from "next/navigation"
import Sidebar from "../../ai-agents/components/Sidebar"
import { ChevronDown, ChevronUp, Plus, ArrowLeft } from "lucide-react"

interface Paper {
  id: string
  title: string
  authors: string[]
  journal: string
  year: number
  insights: string[]
}

const mockPapers: Paper[] = [
  {
    id: "1",
    title: "Climate Change Impacts on Global Biodiversity Patterns: A Comprehensive Meta-Analysis",
    authors: ["Smith, J.A.", "Johnson, A.B.", "Williams, C.D."],
    journal: "Nature Climate Change",
    year: 2024,
    insights: ["Species displacement rates increased by 45% since 2000", "Habitat fragmentation accelerating in tropical regions", "Marine ecosystems showing critical adaptation responses"]
  },
  {
    id: "2", 
    title: "Ecosystem Response Mechanisms to Rapid Temperature Changes in Arctic Environments",
    authors: ["Brown, M.K.", "Davis, K.L.", "Anderson, P.R."],
    journal: "Science",
    year: 2023,
    insights: ["Coral reef bleaching events now annual rather than decadal", "Arctic ice loss exceeding IPCC projections", "Permafrost thaw releasing significant methane volumes"]
  },
  {
    id: "3",
    title: "Biodiversity Conservation Strategies in Climate-Altered Landscapes",
    authors: ["Garcia, L.M.", "Thompson, R.S."],
    journal: "Conservation Biology",
    year: 2024,
    insights: ["Protected area networks require 30% expansion", "Climate corridors essential for species migration", "Assisted migration programs showing promising results"]
  },
  {
    id: "4",
    title: "Tipping Points in Global Ecosystem Function Under Climate Stress",
    authors: ["Chen, W.H.", "Kumar, S.", "Roberts, E.J."],
    journal: "Proceedings of the National Academy of Sciences",
    year: 2023,
    insights: ["Amazon rainforest approaching critical threshold", "Boreal forests shifting to grasslands in northern regions", "Ocean acidification affecting food web stability"]
  }
]

export default function LiteratureReviewResults() {
  const router = useRouter()
  const [collapsed, setCollapsed] = React.useState(false)
  const [stepsExpanded, setStepsExpanded] = React.useState(true)
  const [reportExpanded, setReportExpanded] = React.useState(false)

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Header with Back Button */}
        <div className="border-b border-gray-200 bg-white p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/literature-review")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Search</span>
            </button>
            <div className="h-4 w-px bg-gray-300" />
            <h1 className="text-lg font-semibold text-gray-900">Literature Review Results</h1>
          </div>
        </div>

        <div className="flex flex-1">
          {/* Left Panel - Chat */}
          <div className="w-1/2 border-r border-gray-200 bg-white p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="text-sm font-medium text-blue-800 mb-1">🔍 Search Initiated</div>
                <div className="text-sm text-blue-700">Starting literature review for: "overview of climate change impact on biodiversity"</div>
                <div className="text-xs text-blue-600 mt-2">Mode: Deep Review • Sources: arXiv, PubMed, Google Scholar</div>
              </div>
              
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
                <div className="text-sm font-medium text-orange-800 mb-1">📊 Database Search</div>
                <div className="text-sm text-orange-700">Scanning academic databases...</div>
                <div className="text-xs text-orange-600 mt-2">• arXiv: 245 papers found</div>
                <div className="text-xs text-orange-600">• PubMed: 312 papers found</div>
                <div className="text-xs text-orange-600">• Google Scholar: 162 papers found</div>
              </div>
              
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                <div className="text-sm font-medium text-yellow-800 mb-1">🔬 Quality Assessment</div>
                <div className="text-sm text-yellow-700">Filtering papers by relevance and quality metrics</div>
                <div className="text-xs text-yellow-600 mt-2">719 → 245 papers after filtering</div>
              </div>
              
              <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
                <div className="text-sm font-medium text-purple-800 mb-1">🤖 AI Analysis</div>
                <div className="text-sm text-purple-700">Extracting insights and synthesizing findings...</div>
                <div className="text-xs text-purple-600 mt-2">Processing abstracts and key findings</div>
              </div>
              
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <div className="text-sm font-medium text-green-800 mb-1">✅ Analysis Complete</div>
                <div className="text-sm text-green-700">Generated comprehensive literature review with key insights</div>
                <div className="text-xs text-green-600 mt-2">Ready for export • 4 main themes identified</div>
              </div>
            </div>
          </div>

          {/* Right Panel - Data */}
          <div className="w-1/2 p-4 overflow-y-auto">
            {/* Research Steps */}
            <div className="mb-4 rounded-lg border border-gray-200 bg-white">
              <button
                onClick={() => setStepsExpanded(!stepsExpanded)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <span className="font-medium text-gray-900">Research Steps</span>
                {stepsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {stepsExpanded && (
                <div className="border-t border-gray-200 p-4">
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Query formulation and database selection</li>
                    <li>Paper collection and screening</li>
                    <li>Quality assessment and filtering</li>
                    <li>Data extraction and synthesis</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Report */}
            <div className="mb-4 rounded-lg border border-gray-200 bg-white">
              <button
                onClick={() => setReportExpanded(!reportExpanded)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <span className="font-medium text-gray-900">Report</span>
                {reportExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {reportExpanded && (
                <div className="border-t border-gray-200 p-4">
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <h4 className="font-medium text-gray-900 mb-3">Executive Summary</h4>
                    <p className="mb-4">
                      Climate change significantly impacts global biodiversity through multiple interconnected pathways, 
                      with species displacement rates increasing by 45% since 2000 and critical tipping points being 
                      approached in key ecosystems.
                    </p>
                    
                    <h5 className="font-medium text-gray-900 mb-2">Key Findings:</h5>
                    <ul className="list-disc list-inside space-y-1 mb-4">
                      <li>Marine ecosystems experiencing annual coral bleaching events</li>
                      <li>Arctic ice loss exceeding IPCC projections by 15-25%</li>
                      <li>Amazon rainforest approaching critical threshold for dieback</li>
                      <li>Protected area networks require 30% expansion for climate adaptation</li>
                    </ul>
                    
                    <h5 className="font-medium text-gray-900 mb-2">Recommendations:</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Implement climate corridor strategies for species migration</li>
                      <li>Expand assisted migration programs for vulnerable species</li>
                      <li>Integrate climate projections into conservation planning</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Literature Table */}
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Literature Review</h3>
                  <button className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">
                    <Plus className="h-3 w-3" />
                    Add More Columns
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Papers</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Insights</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {mockPapers.map((paper) => (
                      <tr key={paper.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{paper.title}</div>
                          <div className="text-xs text-gray-500">{paper.authors.join(", ")} • {paper.journal} • {paper.year}</div>
                        </td>
                        <td className="px-4 py-3">
                          <ul className="text-sm text-gray-700 list-disc list-inside">
                            {paper.insights.map((insight, idx) => (
                              <li key={idx}>{insight}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
