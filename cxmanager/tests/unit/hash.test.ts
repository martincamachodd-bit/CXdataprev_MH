import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/lib/hash";

describe("hash", () => {
  it("hashes a password to something other than the plain text", async () => {
    const hash = await hashPassword("minhaSenha123");
    expect(hash).not.toBe("minhaSenha123");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("minhaSenha123");
    await expect(verifyPassword("minhaSenha123", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password against a hash", async () => {
    const hash = await hashPassword("minhaSenha123");
    await expect(verifyPassword("senhaErrada", hash)).resolves.toBe(false);
  });
});
