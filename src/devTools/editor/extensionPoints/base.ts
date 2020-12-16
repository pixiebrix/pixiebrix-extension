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

import { Metadata } from "@/core";
import { Framework, FrameworkMeta, KNOWN_READERS } from "@/messaging/constants";
import { BaseFormState } from "@/devTools/editor/editorSlice";
import psl, { ParsedDomain } from "psl";
import brickRegistry from "@/blocks/registry";
import { ReaderConfig, ReaderDefinition } from "@/blocks/readers/factory";
import {
  defaultSelector,
  readerOptions,
} from "@/devTools/editor/tabs/ReaderTab";

function defaultMatchPattern(url: string): string {
  const obj = new URL(url);
  obj.pathname = "*";
  return obj.href;
}

function defaultReader(frameworks: FrameworkMeta[]): Framework {
  const knownFrameworks = frameworks.filter((x) =>
    KNOWN_READERS.includes(x.id)
  );
  return knownFrameworks.length ? knownFrameworks[0].id : "jquery";
}

export function makeIsAvailable(
  url: string
): { matchPatterns: string; selectors: string | null } {
  return {
    matchPatterns: defaultMatchPattern(url),
    selectors: null,
  };
}

export function makeBaseState(
  uuid: string,
  defaultSelector: string | null,
  metadata: Metadata,
  frameworks: FrameworkMeta[]
): Omit<BaseFormState, "type"> {
  return {
    uuid,
    services: [],
    reader: {
      metadata: {
        id: `${metadata.id}-reader`,
        name: `Default reader for ${metadata.id}`,
      },
      outputSchema: {},
      definition: {
        type: defaultReader(frameworks),
        selector: defaultSelector,
        selectors: {},
      },
    },
    extension: {},
    extensionPoint: {},
  };
}

export async function generateExtensionPointMetadata(
  label: string,
  scope: string,
  url: string,
  reservedNames: string[]
): Promise<Metadata> {
  const urlClass = new URL(url);
  const { domain } = psl.parse(urlClass.host.split(":")[0]) as ParsedDomain;

  await brickRegistry.fetch();

  for (let index = 1; index < 1000; index++) {
    const id =
      index === 1
        ? `${scope ?? "@local"}/${domain}/action`
        : `${scope ?? "@local"}/${domain}/action-${index}`;

    if (!reservedNames.includes(id)) {
      try {
        await brickRegistry.lookup(id);
      } catch (err) {
        return {
          id,
          name: `${domain} ${label}`,
        };
      }
    }
  }
  throw new Error("Could not find available id");
}

export function makeExtensionReader({
  reader,
}: BaseFormState): ReaderConfig<ReaderDefinition> {
  const { metadata, definition, outputSchema = {} } = reader;

  const readerOption = readerOptions.find((x) => x.value === definition.type);

  return {
    apiVersion: "v1",
    kind: "reader",
    metadata: {
      id: metadata.id,
      name: metadata.name,
      version: "1.0.0",
      description: "Reader created with the devtools",
    },
    definition: {
      reader: (readerOption?.makeConfig ?? defaultSelector)(definition),
    },
    outputSchema,
  };
}
