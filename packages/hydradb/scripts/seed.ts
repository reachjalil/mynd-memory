import { readHydraConfig } from "../src/config.js";
import { HydraMemoryRepository } from "../src/repository.js";

const config = readHydraConfig();
const repository = new HydraMemoryRepository(config);

const summary = await repository.seedDemo({
  waitForIndex: process.argv.includes("--wait"),
  timeoutMs: process.argv.includes("--wait") ? 300_000 : 180_000,
});

console.log(JSON.stringify(summary, null, 2));
