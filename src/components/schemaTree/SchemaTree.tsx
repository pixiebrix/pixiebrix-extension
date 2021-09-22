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

import React, { useMemo } from "react";
import { Schema } from "@/core";
import { ListGroup, Table } from "react-bootstrap";
import { isEmpty, sortBy } from "lodash";
import PrimitiveEntry from "@/components/schemaTree/entries/PrimitiveEntry";
import ObjectEntry from "@/components/schemaTree/entries/ObjectEntry";
import ArrayEntry from "./entries/ArrayEntry";
import { TreeEntry } from "@/components/schemaTree/types";
import { useTable, useExpanded } from "react-table";

const typeEntries = new Map<string, TreeEntry>([
  ["object", ObjectEntry],
  ["array", ArrayEntry],
]);

const SchemaTree: React.FunctionComponent<{ schema: Schema }> = ({
  schema,
}) => {
  const data = useMemo(() => {
    console.log("SchemaTree");
    console.log(schema);

    return sortBy(Object.entries(schema.properties ?? {}), (x) => x[0])
      .filter(([, definition]) => typeof definition !== "boolean")
      .map(([prop, definition]) => {
        const schemaDefinition = definition as Schema;
        const { type, description } = schemaDefinition;

        return {
          name: prop,
          type,
          description,
        };
      });
  }, []);

  const columns = useMemo(
    () => [
      {
        Header: "Name",
        accessor: "name",
      },
      {
        Header: "Required",
        accessor: "required",
      },
      {
        Header: "Type",
        accessor: "type",
      },
      {
        Header: "Description",
        accessor: "description",
      },
    ],
    []
  );

  const tableInstance = useTable({ columns, data });

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = tableInstance;

  if (!schema) {
    return (
      <ListGroup variant="flush" className="SchemaTree">
        <ListGroup.Item>No schema</ListGroup.Item>
      </ListGroup>
    );
  }

  return (
    <>
      <Table {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps()}>{column.render("Header")}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  return (
                    <td {...cell.getCellProps()}>{cell.render("Cell")}</td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </Table>
      <ListGroup variant="flush" className="SchemaTree">
        {isEmpty(schema.properties) && (
          <ListGroup.Item>No properties</ListGroup.Item>
        )}
        {sortBy(Object.entries(schema.properties ?? {}), (x) => x[0])
          .filter(([, definition]) => typeof definition !== "boolean")
          .map(([prop, definition]) => {
            const schemaDefinition = definition as Schema;
            const { type } = schemaDefinition;
            const Entry =
              typeof type === "string" ? typeEntries.get(type) : null;

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
    </>
  );
};

export default SchemaTree;
