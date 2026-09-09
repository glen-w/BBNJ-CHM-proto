/**
 * contracts:check — the app copy of the locked Zod contract must be
 * byte-identical to proposal/schemas/events.ts. The proposal file is
 * authoritative; implementation additions live in extensions.ts only.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const authoritative = path.join(root, "proposal", "schemas", "events.ts");
const appCopy = path.join(root, "src", "lib", "contracts", "events.ts");

export function contractsIdentical(): { ok: boolean; message: string } {
  if (!fs.existsSync(authoritative)) {
    return { ok: false, message: `missing authoritative contract: ${authoritative}` };
  }
  if (!fs.existsSync(appCopy)) {
    return { ok: false, message: `missing app copy: ${appCopy}` };
  }
  const a = fs.readFileSync(authoritative);
  const b = fs.readFileSync(appCopy);
  if (a.equals(b)) {
    return { ok: true, message: "contracts identical (proposal/schemas/events.ts == src/lib/contracts/events.ts)" };
  }
  return {
    ok: false,
    message:
      "contract drift: src/lib/contracts/events.ts differs from proposal/schemas/events.ts. " +
      "Revert the app copy or propose an explicit amendment to the proposal file.",
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const result = contractsIdentical();
  console.log(result.ok ? `OK  ${result.message}` : `FAIL ${result.message}`);
  process.exit(result.ok ? 0 : 1);
}
