/**
 * ClawHub+ Module -- Azure Blob Storage Layer
 *
 * Handles tarball upload, download, SAS URL generation,
 * SHA-256 checksum computation, and deletion for skill packages.
 *
 * Uses Azure Blob Storage with Shared Key credential for
 * generating time-limited SAS URLs (1-hour expiry).
 */

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  type ContainerClient,
} from "@azure/storage-blob";
import { createHash } from "node:crypto";
import pino from "pino";
import type { GrcConfig } from "../../config.js";

const logger = pino({ name: "module:clawhub:storage" });

let containerClient: ContainerClient | null = null;
let credential: StorageSharedKeyCredential | null = null;
let containerName = "skills";

/**
 * Build the object key (blob name) path for a skill tarball.
 * Format: skills/{slug}/{version}.tar.gz
 */
function objectKey(slug: string, version: string): string {
  return `skills/${slug}/${version}.tar.gz`;
}

/**
 * Initialize the Azure Blob Storage client and ensure the target container exists.
 */
export async function initStorage(config: GrcConfig["azure"]): Promise<void> {
  credential = new StorageSharedKeyCredential(
    config.accountName,
    config.accountKey,
  );

  const blobServiceClient = new BlobServiceClient(
    `https://${config.accountName}.blob.core.windows.net`,
    credential,
  );

  containerName = config.containerName;
  containerClient = blobServiceClient.getContainerClient(containerName);

  // Ensure the container exists (createIfNotExists is idempotent)
  const createResponse = await containerClient.createIfNotExists();
  if (createResponse.succeeded) {
    logger.info({ container: containerName }, "Created Azure Blob container");
  } else {
    logger.info({ container: containerName }, "Azure Blob container verified");
  }
}

/**
 * Get the initialized container client. Throws if not initialized.
 */
function getContainerClient(): ContainerClient {
  if (!containerClient) {
    throw new Error(
      "Azure Blob storage not initialized. Call initStorage() first.",
    );
  }
  return containerClient;
}

/**
 * Get the initialized credential. Throws if not initialized.
 */
function getCredential(): StorageSharedKeyCredential {
  if (!credential) {
    throw new Error(
      "Azure Blob storage not initialized. Call initStorage() first.",
    );
  }
  return credential;
}

/**
 * Compute the SHA-256 hash of a buffer.
 * Returns a lowercase hex string (64 characters).
 */
export function computeSha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Upload a skill tarball to Azure Blob Storage.
 *
 * @param slug - The skill slug
 * @param version - The semver version string
 * @param buffer - The tarball file buffer
 * @returns The blob storage path (containerName/key)
 */
export async function uploadTarball(
  slug: string,
  version: string,
  buffer: Buffer,
): Promise<string> {
  const cc = getContainerClient();
  const key = objectKey(slug, version);

  const blockBlobClient = cc.getBlockBlobClient(key);
  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: {
      blobContentType: "application/gzip",
    },
  });

  const url = `${containerName}/${key}`;
  logger.info({ slug, version, key, size: buffer.length }, "Tarball uploaded to Azure Blob");
  return url;
}

/**
 * Generate a SAS download URL for a skill tarball.
 * The URL is valid for 1 hour.
 *
 * @param slug - The skill slug
 * @param version - The semver version string
 * @returns SAS URL string
 */
export async function getTarballUrl(
  slug: string,
  version: string,
): Promise<string> {
  const cc = getContainerClient();
  const cred = getCredential();
  const key = objectKey(slug, version);

  const blobClient = cc.getBlobClient(key);

  const expiresOn = new Date();
  expiresOn.setHours(expiresOn.getHours() + 1);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: key,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    cred,
  ).toString();

  return `${blobClient.url}?${sasToken}`;
}

/**
 * Delete a skill tarball from Azure Blob Storage.
 *
 * @param slug - The skill slug
 * @param version - The semver version string
 */
export async function deleteTarball(
  slug: string,
  version: string,
): Promise<void> {
  const cc = getContainerClient();
  const key = objectKey(slug, version);

  const blobClient = cc.getBlobClient(key);
  await blobClient.deleteIfExists();
  logger.info({ slug, version, key }, "Tarball deleted from Azure Blob");
}
