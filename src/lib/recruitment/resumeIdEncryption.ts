import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be configured to encrypt recruitment resume IDs");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptResumeId(id: number): string {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Cannot encrypt an invalid parsed resume ID");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(id), "utf8"),
    cipher.final(),
  ]);

  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptResumeId(token: string): number {
  const [version, ivPart, authTagPart, encryptedPart, ...extra] = token.split(".");
  if (
    version !== "v1" ||
    !ivPart ||
    !authTagPart ||
    !encryptedPart ||
    extra.length > 0
  ) {
    throw new Error("Invalid encrypted parsed resume ID");
  }

  const iv = Buffer.from(ivPart, "base64url");
  const authTag = Buffer.from(authTagPart, "base64url");
  const encrypted = Buffer.from(encryptedPart, "base64url");
  if (iv.length !== 12 || authTag.length !== 16 || encrypted.length === 0) {
    throw new Error("Invalid encrypted parsed resume ID");
  }

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
  if (!/^[1-9]\d*$/.test(plaintext)) {
    throw new Error("Invalid encrypted parsed resume ID");
  }

  const id = Number(plaintext);
  if (!Number.isSafeInteger(id)) {
    throw new Error("Invalid encrypted parsed resume ID");
  }
  return id;
}

export function parseResumeRouteId(value: string): number | null {
  try {
    return decryptResumeId(value);
  } catch {
    if (!/^[1-9]\d*$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
  }
}
