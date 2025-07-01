export interface ContentFormatterProps {
  content: string
}

export function ContentFormatter({ content }: ContentFormatterProps) {
  const renderFormattedContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      // Clean up asterisks and format text properly
      const cleanLine = line
        .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold asterisks
        .replace(/\*([^*]+)\*/g, "$1") // Remove italic asterisks
        .trim()

      // Check if line is a numbered heading (e.g., "1. Key Concepts")
      if (/^\d+\.\s+[A-Z]/.test(cleanLine)) {
        return (
          <h2 key={i} className="font-bold text-xl mt-6 mb-3 text-blue-800 border-b pb-1 border-gray-200">
            {cleanLine}
          </h2>
        )
      }
      // Check if line should be a heading (starts with capital and ends with colon or is all caps)
      else if (cleanLine.match(/^[A-Z][^.]*:?$/) && cleanLine.length < 60) {
        return (
          <h3 key={i} className="font-bold text-lg mt-5 mb-3 text-gray-800">
            {cleanLine.replace(/:$/, "")}
          </h3>
        )
      }
      // Check if line is a numbered list item
      else if (/^\d+\.\s/.test(cleanLine)) {
        const [number, ...rest] = cleanLine.split(". ")
        const content = rest.join(". ")
        // Extract and format any terms that should be bold
        const formattedContent = content.replace(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g, "<strong>$1</strong>")
        return (
          <div key={i} className="flex mb-3 ml-2">
            <span className="font-bold text-blue-700 mr-3 min-w-[20px]">{number}.</span>
            <span className="text-gray-700" dangerouslySetInnerHTML={{ __html: formattedContent }} />
          </div>
        )
      }
      // Check if line starts with a bullet point
      else if (cleanLine.trim().startsWith("•") || cleanLine.trim().match(/^[-*]\s/)) {
        const bulletContent = cleanLine.replace(/^[-*•]\s*/, "").trim()
        // Format key terms in bullet points
        const formattedContent = bulletContent.replace(/^([^:]+):/g, "<strong>$1:</strong>")
        return (
          <div key={i} className="flex mb-2 ml-4">
            <span className="text-blue-600 mr-2 mt-1">•</span>
            <span className="text-gray-700" dangerouslySetInnerHTML={{ __html: formattedContent }} />
          </div>
        )
      }
      // Regular paragraph
      else if (cleanLine.trim()) {
        // Format any key terms that appear in paragraphs
        const formattedContent = cleanLine.replace(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g, (match) => {
          // Only bold if it looks like a technical term or proper noun
          if (
            match.match(
              /^(Machine Learning|Combat Systems|Autonomy|Human-machine Interface|Autonomous Systems|Sensor Fusion|Communication Networks|Decision Support Systems|Cybersecurity)$/i,
            )
          ) {
            return `<strong>${match}</strong>`
          }
          return match
        })

        return (
          <p
            key={i}
            className="mb-3 text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          ></p>
        )
      }
      // Empty line - use smaller spacing
      return <div key={i} className="h-1"></div>
    })
  }

  return (
    <div className="markdown-content bg-white p-6 rounded-lg shadow-sm">
      {renderFormattedContent(content)}
    </div>
  )
} 