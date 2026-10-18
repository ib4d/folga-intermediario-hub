export async function deleteDocumentById(documentId: string): Promise<"complete" | "pending"> {
  const response = await fetch(`/api/documents/${documentId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    message?: string;
    storageCleanup?: "complete" | "pending";
  };

  if (!response.ok || payload.success === false) {
    const message = payload.error || payload.message || "No se pudo eliminar el documento.";
    throw new Error(message);
  }

  return payload.storageCleanup === "pending" ? "pending" : "complete";
}
