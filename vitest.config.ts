import {defineConfig } from "vitest/config"

let reporter = ["text-summary", "html"];
if (process.env.CI) {
  // Include CI reports
  reporter = ["lcovonly", "cobertura"];
}

export default(defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: reporter,
      include: ["src/**/*.*"]
    }
  }
}))