import SummarizerSEOHead from "../../head"

interface HeadProps {
  documentTitle?: string;
  documentType?: string;
  summaryStyle?: string;
  customDescription?: string;
}

export default function Head(props: HeadProps) {
  return <SummarizerSEOHead {...props} />
}
