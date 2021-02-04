/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import fs from "fs";
import blockRegistry from "@/blocks/registry";
import extensionPointRegistry from "@/extensionPoints/registry";
import "@/blocks";
import "@/contrib";

Error.stackTraceLimit = Infinity;

console.log(`version: ${process.env.NPM_PACKAGE_VERSION}`);

const blockDefinitions = blockRegistry.cached().map((block) => ({
  apiVersion: "v1",
  header: true,
  kind: (block as any).read ? "reader" : "component",
  metadata: {
    id: block.id,
    version: process.env.NPM_PACKAGE_VERSION,
    name: block.name,
    description: block.description,
    author: block.author,
  },
  inputSchema: block.inputSchema,
  outputSchema: block.outputSchema,
}));

const extensionPointDefinitions = extensionPointRegistry
  .cached()
  .map((block) => ({
    apiVersion: "v1",
    header: true,
    kind: "extensionPoint",
    metadata: {
      id: block.id,
      version: process.env.NPM_PACKAGE_VERSION,
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
