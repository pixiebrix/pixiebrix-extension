import crypto from "node:crypto";

globalThis.crypto ??= crypto;

// The global might already exist, but lack this method
globalThis.crypto.randomUUID ??= crypto.randomUUID;
