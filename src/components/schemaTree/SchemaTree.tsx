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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCaretDown,
  faCaretRight,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { isServiceField } from "@/components/fields/schemaFields/ServiceField";

const typeEntries = new Map<string, TreeEntry>([
  ["object", ObjectEntry],
  ["array", ArrayEntry],
]);

const ExpandableCell: React.FunctionComponent<{
  row;
  cell;
}> = ({ row, cell }) => (
  <span
    {...row.getToggleRowExpandedProps({
      style: {
        // Indent the row according to depth level
        paddingLeft: `${row.depth * 2}rem`,
      },
    })}
  >
    {row.canExpand && (
      <>
        {row.isExpanded ? (
          <FontAwesomeIcon icon={faCaretDown} />
        ) : (
          <FontAwesomeIcon icon={faCaretRight} />
        )}
      </>
    )}
    <code>{cell.value}</code>
  </span>
);

const CodeCell: React.FunctionComponent<{
  cell;
}> = ({ cell }) => <code>{cell.value}</code>;

const RequiredCell: React.FunctionComponent<{
  row;
}> = ({ row }) => (
  <span>
    {row.values.required && (
      <FontAwesomeIcon icon={faCheck} className="text-success" />
    )}
  </span>
);

const DescriptionCell: React.FunctionComponent<{
  cell;
}> = ({ cell }) => <p className="m-0">{cell.value}</p>;

const SchemaTree: React.FunctionComponent<{ schema: Schema }> = ({
  schema,
}) => {
  const getType = (definition) => {
    const { type, format } = definition as Schema;

    if (definition.oneOf) {
      return "one of many objects";
    }

    if (definition.anyOf) {
      for (const field of definition.anyOf) {
        if (isServiceField(field)) {
          return "integration";
        }
      }

      return "one or more of many objects";
    }

    if (type === "array") {
      const items = definition.items ?? { type: "unknown" };
      const itemType = ((items as Schema) ?? {}).type;
      return itemType ? `${itemType} array` : "array";
    }

    let formatted_type = type;
    if (Array.isArray(type)) {
      formatted_type = `[${type.map(
        (value, index) => `${index !== 0 ? " " : ""}${value}`
      )}]`;
    }

    if (definition.enum) {
      return `${formatted_type} enum`;
    }

    if (format) {
      return `${format} ${type}`;
    }

    return formatted_type ? formatted_type : "unknown";
  };

  const data = useMemo(() => {
    console.log("SchemaTree");
    console.log(schema);

    if (!schema) {
      return [];
    }

    return sortBy(Object.entries(schema.properties ?? {}), (x) => x[0])
      .filter(([, definition]) => typeof definition !== "boolean")
      .map(([prop, definition]) => {
        const schemaDefinition = definition as Schema;
        const { description } = schemaDefinition;

        return {
          name: prop,
          required: schema.required ? schema.required.includes(prop) : false,
          type: getType(schemaDefinition),
          description,
          subRows: [
            {
              name: "test prop",
              required: false,
              type: "test",
              description: "a test sub row",
            },
          ],
        };
      });
  }, [schema]);

  const columns = useMemo(
    () => [
      {
        id: "expander",
        Header: "Name",
        accessor: "name",
        Cell: ExpandableCell,
      },
      {
        Header: "Required",
        accessor: "required",
        Cell: RequiredCell,
      },
      {
        Header: "Type",
        accessor: "type",
        Cell: CodeCell,
      },
      {
        Header: "Description",
        accessor: "description",
        Cell: DescriptionCell,
      },
    ],
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state: { expanded },
  } = useTable({ columns, data }, useExpanded);

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
