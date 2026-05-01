import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";

const endpoint = process.env.AZURE_DI_ENDPOINT;
const key = process.env.AZURE_DI_KEY;

export async function analyzePassport(imageUrl: string) {
  if (!endpoint || !key) {
    console.error("Azure DI credentials missing");
    return null;
  }

  try {
    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
    const poller = await client.beginAnalyzeDocumentFromUrl(
      "prebuilt-idDocument", // Modelo prebuilt de Azure para documentos de identidad
      imageUrl
    );
    const result = await poller.pollUntilDone();
    return result.documents?.[0]?.fields ?? null;
  } catch (error) {
    console.error("OCR Error:", error);
    return null;
  }
}
