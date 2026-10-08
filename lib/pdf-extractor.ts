/**
 * Robust server-side PDF text extraction utility
 * Uses unpdf as primary engine (worker-free, runtime-agnostic)
 * with graceful fallback to pdf2json and raw stream scanner.
 */

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  // Strategy 1: unpdf (zero-worker, works reliably across Node, Turbopack, Next.js chunks)
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const uint8 = new Uint8Array(buffer);
    const pdfDoc = await getDocumentProxy(uint8);
    const { text } = await extractText(pdfDoc, { mergePages: true });
    if (text && text.trim().length > 0) {
      return text.trim();
    }
  } catch (err) {
    console.warn("Strategy 1 (unpdf) warning:", err instanceof Error ? err.message : String(err));
  }

  // Strategy 2: pdf2json (pure Node parser, no worker thread dependencies)
  try {
    const PDFParser = (await import("pdf2json")).default;
    const parser = new PDFParser(null, true);
    const result = await new Promise<string>((resolve, reject) => {
      parser.on("pdfParser_dataError", (errData: unknown) => {
        const error =
          errData instanceof Error
            ? errData
            : (errData as { parserError?: Error })?.parserError ||
              new Error("Failed to parse PDF via pdf2json");
        reject(error);
      });
      parser.on("pdfParser_dataReady", () => {
        try {
          const raw = parser.getRawTextContent();
          resolve(raw || "");
        } catch (e) {
          reject(e);
        }
      });
      parser.parseBuffer(buffer);
    });

    if (result && result.trim().length > 0) {
      return result.trim();
    }
  } catch (err) {
    console.warn("Strategy 2 (pdf2json) warning:", err instanceof Error ? err.message : String(err));
  }

  // Strategy 3: Raw stream fallback (scans standard uncompressed PDF text blocks)
  try {
    const rawContent = buffer.toString("latin1");
    const textChunks: string[] = [];
    const textBlockRegex = /BT[\s\S]*?ET/g;
    const matches = rawContent.match(textBlockRegex);
    if (matches && matches.length > 0) {
      for (const block of matches) {
        const stringRegex = /\(([^)]+)\)\s*T[jJ]/g;
        let strMatch;
        while ((strMatch = stringRegex.exec(block)) !== null) {
          if (strMatch[1]) {
            textChunks.push(strMatch[1]);
          }
        }
      }
      if (textChunks.length > 0) {
        return textChunks.join(" ");
      }
    }
  } catch {
    // ignore
  }

  throw new Error("Unable to extract text from the provided PDF file.");
}
