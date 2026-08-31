import { describe, expect, it } from "vitest";
import { sanitizeFilename } from "../../src/lib/uploads";

describe("sanitizeFilename", () => {
  it("mantém um nome de arquivo normal intacto", () => {
    expect(sanitizeFilename("MEG-MSB-1A.pdf")).toBe("MEG-MSB-1A.pdf");
  });

  it("descarta qualquer diretório embutido (path traversal)", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("..\\..\\windows\\system32\\config")).toBe("config");
    expect(sanitizeFilename("/etc/shadow")).toBe("shadow");
  });

  it("substitui caracteres fora do whitelist por underscore", () => {
    expect(sanitizeFilename("relatório final (rev 2).pdf")).toBe(
      "relat_rio_final__rev_2_.pdf"
    );
  });

  it("nunca retorna uma string vazia", () => {
    expect(sanitizeFilename("")).toBe("arquivo");
    expect(sanitizeFilename("../..")).toBe("arquivo");
  });

  it("resultado nunca contém separador de caminho", () => {
    const inputs = ["../../etc/passwd", "a/b/c.pdf", "a\\b\\c.pdf", "...."];
    for (const input of inputs) {
      const result = sanitizeFilename(input);
      expect(result).not.toContain("/");
      expect(result).not.toContain("\\");
      expect(result).not.toContain("..");
    }
  });
});
