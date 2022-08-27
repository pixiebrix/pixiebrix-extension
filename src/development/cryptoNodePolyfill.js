import crypto from "crypto";

// Enable crypto.randomUUID() on Node
if (!("crypto" in globalThis)) {
  globalThis.crypto = crypto;
}
