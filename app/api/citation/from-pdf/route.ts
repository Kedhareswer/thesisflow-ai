import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { citationService } from "@/lib/services/citation.service";

export const runtime = "nodejs"; // Ensure Node runtime for Buffer and pdf-parse

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll("file");
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results: Array<{
      fileName: string;
      citation: any | null;
      formatted: any | null;
      error?: string;
    }> = [];

    for (const f of files) {
      if (!(f instanceof File)) continue;
      const fileName = f.name || "upload.pdf";
      try {
        const ab = await f.arrayBuffer();
        const buffer = Buffer.from(ab);
        const data = await pdfParse(buffer);
        const text = data?.text || "";
        const citation = await citationService.extractFromPdfText(text);
        if (citation) {
          const formatted = citationService.formatCitation(citation);
          results.push({ fileName, citation, formatted });
        } else {
          results.push({ fileName, citation: null, formatted: null, error: "No citation detected" });
        }
      } catch (err: any) {
        results.push({ fileName, citation: null, formatted: null, error: err?.message || "Parse failed" });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("from-pdf API error:", error);
    return NextResponse.json({ error: "Failed to process files" }, { status: 500 });
  }
}
