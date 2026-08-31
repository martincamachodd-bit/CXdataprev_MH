import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

// Descarta qualquer diretório embutido no nome (inclusive "../"). Faz a
// divisão manualmente por "/" e "\" — `path.basename` só trata "\" como
// separador no Windows (win32), não no Linux (posix), e isso não pode
// depender do SO onde o servidor roda. O whitelist de caracteres garante
// que o que sobra nunca vira um separador de caminho. Nunca usar o nome
// original do cliente como caminho de disco — só como metadado de exibição.
export function sanitizeFilename(original: string): string {
  const lastSegment = original.split(/[/\\]/).pop() ?? "";
  const cleaned = lastSegment.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Nome vazio ou só de pontos (".", "..", "...") nunca é um nome válido —
  // mesmo sem separador, ainda seria um segmento de caminho especial.
  return cleaned.length > 0 && !/^\.+$/.test(cleaned) ? cleaned : "arquivo";
}

export async function saveUploadedFile(
  assetTag: string,
  originalFilename: string,
  data: Buffer
): Promise<{ storedPath: string; filename: string }> {
  const safeTag = sanitizeFilename(assetTag);
  const safeName = sanitizeFilename(originalFilename);
  const storedName = `${randomBytes(6).toString("hex")}-${safeName}`;

  const assetDir = path.join(UPLOADS_ROOT, safeTag);
  await mkdir(assetDir, { recursive: true });
  await writeFile(path.join(assetDir, storedName), data);

  return {
    storedPath: path.join(safeTag, storedName),
    filename: originalFilename,
  };
}
