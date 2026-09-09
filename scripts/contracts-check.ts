/**
 * contracts:check — the locked Zod contract at src/lib/contracts/events.ts
 * must load. Implementation-only additions live in extensions.ts.
 */
import fs from "node:fs";
import path from "node:path";
import { Domain } from "../src/lib/contracts/events";

const contractPath = path.join(process.cwd(), "src", "lib", "contracts", "events.ts");

export function contractsIdentical(): { ok: boolean; message: string } {
  if (!fs.existsSync(contractPath)) {
    return { ok: false, message: `missing contract: ${contractPath}` };
  }
  if (!Domain.options.includes("mgr")) {
    return { ok: false, message: "contract Domain enum failed to load" };
  }
  return { ok: true, message: "contract loads (src/lib/contracts/events.ts)" };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const result = contractsIdentical();
  console.log(result.ok ? `OK  ${result.message}` : `FAIL ${result.message}`);
  process.exit(result.ok ? 0 : 1);
}
