import React, { useMemo, useState } from "react";
import genericOptionsFactory from "./blockOptions";
import cx from "classnames";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { FieldProps } from "@/components/fields/propTypes";
import { inputProperties } from "@/helpers";
import { IBlock } from "@/core";
import castArray from "lodash/castArray";
import ErrorBoundary from "@/components/ErrorBoundary";
import { FieldArray, useField, useFormikContext } from "formik";
import { fieldLabel } from "@/components/fields/fieldUtils";
import blockRegistry from "@/blocks/registry";
import Card from "react-bootstrap/Card";
import { faCaretDown, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getIn } from "formik";
import isEmpty from "lodash/isEmpty";
import BlockSelector from "@/components/fields/BlockSelector";

import "./BlockField.scss";
import Button from "react-bootstrap/Button";

export const SCHEMA_TYPE_TO_BLOCK_PROPERTY: { [key: string]: string } = {
  "#/definitions/renderer": "render",
  "#/definitions/effect": "effect",
  "#/definitions/reader": "read",
  "#/definitions/transformer": "transform",
  "https://app.pixiebrix.com/schemas/renderer#": "render",
  "https://app.pixiebrix.com/schemas/effect#": "effect",
  "https://app.pixiebrix.com/schemas/reader#": "read",
  "https://app.pixiebrix.com/schemas/transformer#": "transform",
  "https://app.pixiebrix.com/schemas/renderer": "render",
  "https://app.pixiebrix.com/schemas/effect": "effect",
  "https://app.pixiebrix.com/schemas/reader": "read",
  "https://app.pixiebrix.com/schemas/transformer": "transform",
};

type ConfigValue = { [key: string]: string };

const BlockCard: React.FunctionComponent<{
  name: string;
  config: BlockConfig;
  showOutputKey: boolean;
  onRemove: () => void;
}> = ({ config, name, showOutputKey, onRemove }) => {
  const context = useFormikContext();

  const isValid = isEmpty(getIn(context.errors, name));

  const [collapsed, setCollapsed] = useState(true);

  const [block, BlockOptions] = useMemo(() => {
    const block = blockRegistry.lookup(config.id);
    return [block, genericOptionsFactory(inputProperties(block.inputSchema))];
  }, [config.id]);

  return (
    <Card className={cx("BlockCard", { invalid: !isValid })}>
      <Card.Header className={cx({ "bg-danger": !isValid })}>
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{ cursor: "pointer" }}
          className="d-flex"
        >
          <div>
            <FontAwesomeIcon icon={collapsed ? faCaretRight : faCaretDown} />{" "}
            {block.id}
          </div>
          <div className="ml-auto">
            {config.outputKey && (
              <code className={cx({ "text-white": !isValid })}>
                @{config.outputKey}
              </code>
            )}
          </div>
        </div>
      </Card.Header>
      {!collapsed && (
        <Card.Body>
          <BlockOptions
            name={name}
            configKey="config"
            showOutputKey={showOutputKey}
          />
          <Button variant="danger" onClick={onRemove}>
            Remove Block
          </Button>
        </Card.Body>
      )}
    </Card>
  );
};

interface BlockConfig {
  id: string;
  // optionally, a name to store the output to
  outputKey?: string;
  config: ConfigValue;
}

interface ExtraProps {
  blocks: IBlock[];
}

const BlockField: React.FunctionComponent<
  FieldProps<BlockConfig | BlockConfig[]> & ExtraProps
> = ({ label, schema, blocks, ...props }) => {
  const [field, meta] = useField(props);

  const pipeline = useMemo(() => castArray(field.value ?? []), [field.value]);

  const numBlocks = pipeline.length;

  return (
    <Form.Group as={Row} controlId={field.name}>
      <Form.Label column sm="2">
        {label ?? fieldLabel(field.name)}
      </Form.Label>
      <Col sm="10">
        <FieldArray name={field.name}>
          {({ remove, push }) => (
            <div>
              {!!pipeline.length && (
                <div className="mb-3">
                  {pipeline.map((blockConfig, index) => (
                    <ErrorBoundary key={index}>
                      <BlockCard
                        name={`${field.name}.${index}`}
                        config={blockConfig}
                        showOutputKey={index < numBlocks - 1}
                        onRemove={() => remove(index)}
                      />
                    </ErrorBoundary>
                  ))}
                </div>
              )}

              <div style={{ width: 300 }} className="">
                <BlockSelector
                  blocks={blocks}
                  onSelect={(x: IBlock) => push({ id: x.id, config: {} })}
                  placeholder="Add a block"
                />
                {typeof meta.error === "string" && (
                  <div style={{ color: "#dc3545" }}>
                    <small>{meta.error}</small>
                  </div>
                )}
              </div>
            </div>
          )}
        </FieldArray>
      </Col>
    </Form.Group>
  );
};

export default BlockField;
