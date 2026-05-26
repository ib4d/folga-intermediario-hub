import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type StorageProviderName = "supabase";

export interface UploadObjectInput {
  path: string;
  body: Buffer;
  contentType: string;
  upsert?: boolean;
}

export interface UploadObjectResult {
  path: string;
  publicUrl: string;
}

export interface StorageProvider {
  readonly name: StorageProviderName;
  uploadObject(input: UploadObjectInput): Promise<UploadObjectResult>;
  removeObjects(paths: string[]): Promise<void>;
  getObjectPathFromPublicUrl(publicUrl: string): string | null;
  checkConnection(): Promise<void>;
}

const DEFAULT_BUCKET = "documentos-candidatos";

function getStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
}

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase storage is not configured.");
  }

  supabaseAdmin = createClient(url, serviceRoleKey);
  return supabaseAdmin;
}

function formatStorageError(prefix: string, error: { message: string }) {
  return new Error(`${prefix}: ${error.message}`);
}

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase" as const;

  async uploadObject(input: UploadObjectInput): Promise<UploadObjectResult> {
    const bucket = getStorageBucket();
    const { error } = await getSupabaseAdmin()
      .storage
      .from(bucket)
      .upload(input.path, input.body, {
        contentType: input.contentType,
        upsert: input.upsert ?? false,
      });

    if (error) {
      throw formatStorageError("Error de subida", error);
    }

    const {
      data: { publicUrl },
    } = getSupabaseAdmin().storage.from(bucket).getPublicUrl(input.path);

    return { path: input.path, publicUrl };
  }

  async removeObjects(paths: string[]): Promise<void> {
    if (paths.length === 0) return;

    const { error } = await getSupabaseAdmin().storage.from(getStorageBucket()).remove(paths);
    if (error) {
      throw formatStorageError("Error eliminando archivo", error);
    }
  }

  getObjectPathFromPublicUrl(publicUrl: string): string | null {
    const marker = `${getStorageBucket()}/`;
    const [, path] = publicUrl.split(marker);
    return path || null;
  }

  async checkConnection(): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .storage
      .from(getStorageBucket())
      .list("", { limit: 1 });

    if (error) {
      throw formatStorageError("Storage no disponible", error);
    }
  }
}

export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || "supabase";

  if (provider !== "supabase") {
    throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
  }

  return new SupabaseStorageProvider();
}
