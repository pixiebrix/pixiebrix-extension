/*
 * Copyright (C) 2021 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import React from "react";
import { Schema } from "@/core";
import { ListGroup } from "react-bootstrap";
import { isEmpty, sortBy } from "lodash";
import PrimitiveEntry from "@/components/schemaTree/entries/PrimitiveEntry";
import ObjectEntry from "@/components/schemaTree/entries/ObjectEntry";
import ArrayEntry from "./entries/ArrayEntry";
import { TreeEntry } from "@/components/schemaTree/types";

const typeEntries = new Map<string, TreeEntry>([
  ["object", ObjectEntry],
  ["array", ArrayEntry],
]);

const SchemaTree: React.FunctionComponent<{ schema: Schema }> = ({
  schema,
}) => {
  if (!schema) {
    return (
      <ListGroup variant="flush" className="SchemaTree">
        <ListGroup.Item>No schema</ListGroup.Item>
      </ListGroup>
    );
  }

  console.log("SchemaTree");
  console.log(schema);

  return (
    <ListGroup variant="flush" className="SchemaTree">
      {isEmpty(schema.properties) && (
        <ListGroup.Item>No properties</ListGroup.Item>
      )}
      {sortBy(Object.entries(schema.properties ?? {}), (x) => x[0])
        .filter(([, definition]) => typeof definition !== "boolean")
        .map(([prop, definition]) => {
          const schemaDefinition = definition as Schema;
          const { type } = schemaDefinition;
          const Entry = typeof type === "string" ? typeEntries.get(type) : null;

          if (Entry) {
            return (
              <Entry
                key={prop}
                prop={prop}
                definition={schemaDefinition}
                TreeRenderer={SchemaTree}
              />
            );
          }

          return (
            <PrimitiveEntry
              key={prop}
              prop={prop}
              definition={schemaDefinition}
            />
          );
        })}
    </ListGroup>
  );
};

export default SchemaTree;
