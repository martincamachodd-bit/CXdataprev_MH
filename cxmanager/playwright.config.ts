import { defineConfig, devices } from "@playwright/test";

// Alguns testes criam/limpam dados direto via Prisma (não só pela UI) para
// ficarem independentes de execuções anteriores contra o Postgres real —
// precisam de DATABASE_URL no processo do test runner, não só no webServer.
process.loadEnvFile(".env");

export default defineConfig({
  testDir: "./tests/e2e",
  // Serial: the `npm run dev` webServer below is a single Next.js dev
  // instance (Turbopack, on-demand compilation) shared by every test.
  // Concurrent Auth.js sign-ins against it raced and produced spurious
  // CredentialsSignin failures on valid credentials — see commit history.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
