import fs from "fs";
import blockRegistry from "@/blocks/registry";
import extensionPointRegistry from "@/extensionPoints/registry";
import "@/blocks";

const blockDefinitions = blockRegistry.all().map((block) => ({
  apiVersion: "v1",
  header: true,
  kind: (block as any).read ? "reader" : "component",
  metadata: {
    id: block.id,
    version: process.env.npm_package_version,
    name: block.name,
    description: block.description,
    author: block.author,
  },
  inputSchema: block.inputSchema,
  outputSchema: block.outputSchema,
}));

const extensionPointDefinitions = extensionPointRegistry.all().map((block) => ({
  apiVersion: "v1",
  header: true,
  kind: "extensionPoint",
  metadata: {
    id: block.id,
    version: process.env.npm_package_version,
    name: block.name,
    description: block.description,
    author: block.author,
  },
  inputSchema: block.inputSchema,
}));

fs.writeFileSync(
  "headers.json",
  JSON.stringify([...blockDefinitions, ...extensionPointDefinitions])
);
