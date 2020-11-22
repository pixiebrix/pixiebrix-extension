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

import Card from "react-bootstrap/Card";
import React, { useMemo, useState } from "react";
import { IExtensionPoint, Schema } from "@/core";
import ListGroup from "react-bootstrap/ListGroup";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import sortBy from "lodash/sortBy";
import isEmpty from "lodash/isEmpty";

import "./DataSourceCard.scss";
import { useAsyncState } from "@/hooks/common";
import { GridLoader } from "react-spinners";

const ObjectEntry: React.FunctionComponent<{
  prop: string;
  definition: Schema;
}> = ({ prop, definition }) => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <ListGroup.Item key={prop}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{ cursor: "pointer" }}
      >
        <FontAwesomeIcon icon={collapsed ? faCaretRight : faCaretDown} />{" "}
        <span>{prop}</span>
        <span className="type">: object</span>
      </div>
      {!collapsed && (
        // @ts-ignore: we filtered over the boolean case
        <SchemaTree schema={definition} />
      )}
    </ListGroup.Item>
  );
};

const ArrayEntry: React.FunctionComponent<{
  prop: string;
  definition: Schema;
}> = ({ prop, definition }) => {
  const [collapsed, setCollapsed] = useState(true);

  // @ts-ignore: for some reason we're getting item instead of items in some of the reader output specs
  const items = definition.items ?? { type: "unknown" };
  const itemType = ((items as Schema) ?? {}).type;

  if (itemType === "object") {
    return (
      <ListGroup.Item>
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{ cursor: "pointer" }}
        >
          <FontAwesomeIcon icon={collapsed ? faCaretRight : faCaretDown} />{" "}
          <span>{prop}</span>
          <span className="type">: array of objects</span>
        </div>
        {!collapsed && (
          // @ts-ignore: we filtered over the boolean case
          <SchemaTree schema={items} />
        )}
      </ListGroup.Item>
    );
  } else {
    return (
      <ListGroup.Item>
        <span>{prop}</span>
        <span className="type">: array of {itemType}</span>
      </ListGroup.Item>
    );
  }
};

const PrimitiveEntry: React.FunctionComponent<{
  prop: string;
  definition: Schema;
}> = ({ prop, definition }) => {
  const { type = "unknown", format } = definition;
  return (
    <ListGroup.Item key={prop}>
      <span>{prop}</span>
      <span className="type">: {format ? `${format} ${type}` : type}</span>
    </ListGroup.Item>
  );
};

const SchemaTree: React.FunctionComponent<{ schema: Schema }> = ({
  schema,
}) => {
  return (
    <ListGroup variant="flush">
      {isEmpty(schema.properties) && (
        <ListGroup.Item>Reader provides no data</ListGroup.Item>
      )}
      {sortBy(Object.entries(schema.properties ?? {}), (x) => x[0])
        .filter((x) => typeof x[1] !== "boolean")
        .map(([prop, definition]) => {
          const schemaDefinition = definition as Schema;
          const { type } = schemaDefinition;

          if (type === "object") {
            return (
              <ObjectEntry
                prop={prop}
                definition={schemaDefinition}
                key={prop}
              />
            );
          } else if (type === "array") {
            return (
              <ArrayEntry
                prop={prop}
                definition={schemaDefinition}
                key={prop}
              />
            );
          } else {
            return (
              <PrimitiveEntry
                prop={prop}
                definition={schemaDefinition}
                key={prop}
              />
            );
          }
        })}
    </ListGroup>
  );
};

const DataSourceCard: React.FunctionComponent<{
  extensionPoint: IExtensionPoint;
}> = ({ extensionPoint }) => {
  const [outputSchema, isPending, error] = useAsyncState(async () => {
    const reader = await extensionPoint.defaultReader();
    return reader.outputSchema;
  }, [extensionPoint]);

  const body = useMemo(() => {
    if (isPending) {
      return <GridLoader />;
    } else if (error) {
      return <Card.Body>{error.toString()}</Card.Body>;
    } else if (isEmpty(outputSchema)) {
      return <Card.Body>No schema available</Card.Body>;
    } else {
      return <SchemaTree schema={outputSchema} />;
    }
  }, [outputSchema, isPending]);

  return <div className="DataSourceCard">{body}</div>;
};

export default DataSourceCard;
