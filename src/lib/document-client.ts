export async function deleteDocumentById(documentId: string): Promise<void> {
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
  };

  if (!response.ok || payload.success === false) {
    const message = payload.error || payload.message || "No se pudo eliminar el documento.";
    throw new Error(message);
  }
}
