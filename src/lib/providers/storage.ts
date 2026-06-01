import { mkdir, rm, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import providerManifest from "./provider-manifest.json";

export type StorageProviderName = "supabase" | "local";
export type StorageProviderMode = "supabase" | "local";

export interface StorageProviderStatus {
  readonly name: StorageProviderName;
  readonly mode: StorageProviderMode;
  readonly statusLabel: string;
  readonly statusDescription: string;
}

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
const DEFAULT_LOCAL_STORAGE_DIR = path.join(process.cwd(), "public", "uploads");

function getStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
}

function getLocalStorageDir() {
  return process.env.LOCAL_STORAGE_DIR || DEFAULT_LOCAL_STORAGE_DIR;
}

function getLocalPublicBaseUrl() {
  const authUrl = process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000";
  return authUrl.replace(/\/+$/, "");
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

export class LocalDiskStorageProvider implements StorageProvider {
  readonly name = "local" as const;

  private async ensureBaseDir() {
    await mkdir(getLocalStorageDir(), { recursive: true });
  }

  private resolveTargetPath(relativePath: string) {
    const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
    const target = path.resolve(getLocalStorageDir(), normalized);
    const base = path.resolve(getLocalStorageDir());

    if (!target.startsWith(base)) {
      throw new Error("Ruta de almacenamiento local invalida.");
    }

    return { normalized, target };
  }

  async uploadObject(input: UploadObjectInput): Promise<UploadObjectResult> {
    await this.ensureBaseDir();
    const { normalized, target } = this.resolveTargetPath(input.path);

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, input.body);

    const publicUrl = `${getLocalPublicBaseUrl()}/uploads/${normalized}`;
    return { path: normalized, publicUrl };
  }

  async removeObjects(paths: string[]): Promise<void> {
    for (const relativePath of paths) {
      const { target } = this.resolveTargetPath(relativePath);
      await rm(target, { force: true });
    }
  }

  getObjectPathFromPublicUrl(publicUrl: string): string | null {
    const localMarker = "/uploads/";
    const markerIndex = publicUrl.indexOf(localMarker);
    if (markerIndex === -1) return null;

    return publicUrl.slice(markerIndex + localMarker.length) || null;
  }

  async checkConnection(): Promise<void> {
    await this.ensureBaseDir();
    await access(getLocalStorageDir());
  }
}

type StorageProviderConfig = {
  readonly provider: StorageProvider;
  readonly status: StorageProviderStatus;
};

function isSupportedStorageProviderName(value: string): value is StorageProviderName {
  return providerManifest.storage.includes(value as StorageProviderName);
}

const STORAGE_PROVIDER_REGISTRY: Record<StorageProviderName, StorageProviderConfig> = {
  supabase: {
    provider: new SupabaseStorageProvider(),
    status: {
      name: "supabase",
      mode: "supabase",
      statusLabel: "Supabase Storage",
      statusDescription: "Los archivos se guardan y sirven desde Supabase Storage.",
    },
  },
  local: {
    provider: new LocalDiskStorageProvider(),
    status: {
      name: "local",
      mode: "local",
      statusLabel: "Local disk",
      statusDescription: "Los archivos se guardan en el disco persistente del VPS.",
    },
  },
};

export function getAvailableStorageProviders(): readonly StorageProviderStatus[] {
  return Object.values(STORAGE_PROVIDER_REGISTRY).map((entry) => entry.status);
}

export function getStorageProvider(): StorageProvider {
  const provider = (process.env.STORAGE_PROVIDER || "supabase").trim();
  if (isSupportedStorageProviderName(provider)) {
    return STORAGE_PROVIDER_REGISTRY[provider].provider;
  }

  throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
}

export function getStorageProviderStatus(): StorageProviderStatus {
  const provider = (process.env.STORAGE_PROVIDER || "supabase").trim();

  if (isSupportedStorageProviderName(provider)) {
    return STORAGE_PROVIDER_REGISTRY[provider].status;
  }

  return STORAGE_PROVIDER_REGISTRY.supabase.status;
}
