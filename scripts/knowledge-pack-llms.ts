// Prints the llms.txt "Quick answers" section from the saabai pack. Dry run: never writes public/llms.txt.
import { packLlmsSection, validatePack } from "../lib/knowledge-pack/core";
import { SAABAI_PACK } from "../lib/knowledge-pack/saabai";
const errs = validatePack(SAABAI_PACK);
if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
console.log(packLlmsSection(SAABAI_PACK));
