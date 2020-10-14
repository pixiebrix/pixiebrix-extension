import Card from "react-bootstrap/Card";
import React, { useMemo, useState } from "react";
import { IExtensionPoint, Schema } from "@/core";
import ListGroup from "react-bootstrap/ListGroup";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import sortBy from "lodash/sortBy";
import isEmpty from "lodash/isEmpty";

import "./DataSourceCard.scss";

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
  const outputSchema = useMemo(
    () => extensionPoint.defaultReader().outputSchema,
    [extensionPoint]
  );

  return (
    <div className="DataSourceCard">
      {isEmpty(outputSchema) ? (
        <Card.Body>No schema available</Card.Body>
      ) : (
        <>
          <SchemaTree schema={outputSchema} />
        </>
      )}
    </div>
  );
};

export default DataSourceCard;
