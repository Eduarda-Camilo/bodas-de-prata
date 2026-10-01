import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";
// Ephemeral credentials only for local tests. Never written to application files.
process.env.TEST_TRIP_SECRET ??= randomBytes(32).toString("hex");
const testSessionSecret = randomBytes(32).toString("hex");
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  },
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    env: {
      TRIP_SECRET: process.env.TEST_TRIP_SECRET,
      SESSION_SECRET: testSessionSecret,
      APP_ORIGIN: "http://localhost:3100",
    },
    timeout: 60000,
  },
});
