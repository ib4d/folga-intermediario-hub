import { access, chmod, lstat, mkdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
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
  createSignedDownloadUrl(path: string, fileName?: string): Promise<string | null>;
  checkConnection(): Promise<void>;
}

export class StoredObjectRemovalError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "StoredObjectRemovalError";
  }
}

function decodeStoredObjectPath(encodedPath: string): string | null {
  try {
    const path = decodeURIComponent(encodedPath);
    if (
      !path ||
      path.includes("\\") ||
      path.includes("\0") ||
      path.split("/").some((segment) => segment === "." || segment === "..")
    ) {
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

export function resolveStoredObjectPathsForUrls(publicUrls: string[]): string[] {
  if (publicUrls.length === 0) return [];
  const storage = getStorageProvider();
  const paths = publicUrls.map((url) => storage.getObjectPathFromPublicUrl(url));
  if (paths.some((objectPath) => !objectPath)) {
    throw new StoredObjectRemovalError(
      "No se pudo identificar el archivo de almacenamiento; se conservó el registro."
    );
  }

  return [...new Set(paths as string[])];
}

export function getStorageProviderConfigurationFingerprint(): string {
  const storage = getStorageProvider();
  const configuration = storage.name === "supabase"
    ? `${storage.name}\0${process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ""}\0${getStorageBucket()}`
    : `${storage.name}\0${path.resolve(getLocalStorageDir())}`;

  return createHash("sha256").update(configuration).digest("hex");
}

const DEFAULT_BUCKET = "documentos-candidatos";
const LOCAL_STORAGE_DIRECTORY_MODE = 0o700;
const LOCAL_STORAGE_FILE_MODE = 0o600;

function getStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
}

function getLocalStorageDir() {
  return process.env.LOCAL_STORAGE_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "private-uploads");
}

async function ensurePrivateStorageDirectory(directory: string) {
  await mkdir(directory, { recursive: true, mode: LOCAL_STORAGE_DIRECTORY_MODE });
  const info = await lstat(directory);
  if (info.isSymbolicLink() || !info.isDirectory()) {
    throw new Error("El directorio de almacenamiento local no es un directorio seguro.");
  }
  await chmod(directory, LOCAL_STORAGE_DIRECTORY_MODE);
}

async function ensurePrivateStorageDirectoryTree(directory: string) {
  const storageRoot = path.resolve(getLocalStorageDir());
  const targetDirectory = path.resolve(directory);
  const relative = path.relative(storageRoot, targetDirectory);

  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("La ruta del directorio sale del almacenamiento local.");
  }

  await ensurePrivateStorageDirectory(storageRoot);
  let current = storageRoot;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    await ensurePrivateStorageDirectory(current);
  }
}

export function resolveLocalStorageAbsolutePath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const target = path.resolve(getLocalStorageDir(), normalized);
  const base = path.resolve(getLocalStorageDir());
  const relativeTarget = path.relative(base, target);
  const relativeToPublic = path.relative(path.resolve(process.cwd(), "public"), base);
  const storageInsidePublic =
    relativeToPublic === "" ||
    (relativeToPublic !== ".." && !relativeToPublic.startsWith(`..${path.sep}`) && !path.isAbsolute(relativeToPublic));

  if (!relativeTarget || relativeTarget === ".." || relativeTarget.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTarget)) {
    throw new Error("Ruta de almacenamiento local invalida.");
  }
  if (storageInsidePublic) {
    throw new Error("El almacenamiento de documentos debe estar fuera del directorio publico.");
  }

  return { normalized, target };
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

async function assertPrivateSupabaseBucket() {
  const bucketName = getStorageBucket();
  const { data: bucket, error } = await getSupabaseAdmin().storage.getBucket(bucketName);

  if (error) {
    throw formatStorageError("Storage no disponible", error);
  }
  if (bucket.public) {
    throw new Error(`El bucket ${bucketName} debe ser privado para documentos de candidatos.`);
  }
}

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase" as const;

  async uploadObject(input: UploadObjectInput): Promise<UploadObjectResult> {
    await assertPrivateSupabaseBucket();
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

    const bucket = getSupabaseAdmin().storage.from(getStorageBucket());
    const removeBatchSize = 1000;
    const verificationBatchSize = 10;
    for (let removeIndex = 0; removeIndex < paths.length; removeIndex += removeBatchSize) {
      const removeBatch = paths.slice(removeIndex, removeIndex + removeBatchSize);
      const { error } = await bucket.remove(removeBatch);
      if (error) {
        throw formatStorageError("Error eliminando archivo", error);
      }

      // Do not clear the deletion outbox until each requested object is absent.
      // Storage's remove response can omit objects that were already missing,
      // so verify the desired state rather than requiring one response row per path.
      for (let index = 0; index < removeBatch.length; index += verificationBatchSize) {
        const batch = removeBatch.slice(index, index + verificationBatchSize);
        const results = await Promise.all(batch.map(async (objectPath) => {
          const { data: exists, error: existsError } = await bucket.exists(objectPath);
          if (existsError && existsError.status !== 404) {
            throw formatStorageError("No se pudo verificar el borrado del archivo", existsError);
          }
          return exists ? objectPath : null;
        }));

        if (results.some((objectPath) => objectPath !== null)) {
          throw new StoredObjectRemovalError("STORAGE_OBJECTS_STILL_EXIST");
        }
      }
    }
  }

  getObjectPathFromPublicUrl(publicUrl: string): string | null {
    let url: URL;
    let configuredUrl: URL;
    try {
      url = new URL(publicUrl);
      configuredUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    } catch {
      return null;
    }

    if (
      url.origin !== configuredUrl.origin ||
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    const basePath = configuredUrl.pathname.replace(/\/+$/, "");
    const expectedPrefix = `${basePath}/storage/v1/object/public/${getStorageBucket()}/`;
    if (!url.pathname.startsWith(expectedPrefix)) return null;

    return decodeStoredObjectPath(url.pathname.slice(expectedPrefix.length));
  }

  async createSignedDownloadUrl(objectPath: string, fileName?: string): Promise<string> {
    await assertPrivateSupabaseBucket();
    const { data, error } = await getSupabaseAdmin()
      .storage
      .from(getStorageBucket())
      .createSignedUrl(objectPath, 60, fileName ? { download: fileName } : undefined);

    if (error) {
      throw formatStorageError("No se pudo firmar el acceso al documento", error);
    }
    return data.signedUrl;
  }

  async checkConnection(): Promise<void> {
    await assertPrivateSupabaseBucket();
  }
}

export class LocalDiskStorageProvider implements StorageProvider {
  readonly name = "local" as const;

  private async ensureBaseDir() {
    resolveLocalStorageAbsolutePath(".storage-check");
    await ensurePrivateStorageDirectoryTree(getLocalStorageDir());
  }

  private resolveTargetPath(relativePath: string) {
    return resolveLocalStorageAbsolutePath(relativePath);
  }

  async uploadObject(input: UploadObjectInput): Promise<UploadObjectResult> {
    await this.ensureBaseDir();
    const { normalized, target } = this.resolveTargetPath(input.path);

    await ensurePrivateStorageDirectoryTree(path.dirname(target));
    const existing = await lstat(target).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (existing?.isSymbolicLink() || (existing && !existing.isFile())) {
      throw new Error("El objeto de almacenamiento local no es un archivo regular.");
    }
    await writeFile(target, input.body, { mode: LOCAL_STORAGE_FILE_MODE });
    await chmod(target, LOCAL_STORAGE_FILE_MODE);

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
    let url: URL;
    let configuredUrl: URL;
    try {
      url = new URL(publicUrl);
      configuredUrl = new URL(getLocalPublicBaseUrl());
    } catch {
      return null;
    }

    if (
      url.origin !== configuredUrl.origin ||
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    const basePath = configuredUrl.pathname.replace(/\/+$/, "");
    const expectedPrefix = `${basePath}/uploads/`;
    if (!url.pathname.startsWith(expectedPrefix)) return null;

    return decodeStoredObjectPath(url.pathname.slice(expectedPrefix.length));
  }

  async createSignedDownloadUrl(): Promise<string | null> {
    return null;
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
  return value in providerManifest.storage;
}

const STORAGE_PROVIDER_REGISTRY: Record<StorageProviderName, StorageProviderConfig> = {
  supabase: {
    provider: new SupabaseStorageProvider(),
    status: {
      name: "supabase",
      mode: "supabase",
      statusLabel: providerManifest.storage.supabase.statusLabel,
      statusDescription: providerManifest.storage.supabase.statusDescription,
    },
  },
  local: {
    provider: new LocalDiskStorageProvider(),
    status: {
      name: "local",
      mode: "local",
      statusLabel: providerManifest.storage.local.statusLabel,
      statusDescription: providerManifest.storage.local.statusDescription,
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
