/*
 * Copyright (C) 2021 Pixie Brix, LLC
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

import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Col,
  Container,
  Form,
  InputGroup,
  ListGroup,
  Row,
} from "react-bootstrap";
import { IBlock, Schema } from "@/core";
import Fuse from "fuse.js";
import { isEmpty, sortBy } from "lodash";
import copy from "copy-to-clipboard";
import { BlockType, getType } from "@/blocks/util";
import useAsyncEffect from "use-async-effect";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getIcon } from "@/components/fields/BlockModal";
import cx from "classnames";
import "./BrickReference.scss";
import { SchemaTree } from "@/options/pages/extensionEditor/DataSourceCard";
import { faClipboard } from "@fortawesome/free-solid-svg-icons";
import { useToasts } from "react-toast-notifications";
import GridLoader from "react-spinners/GridLoader";

const DetailSection: React.FunctionComponent<{ title: string }> = ({
  title,
  children,
}) => {
  return (
    <div className="my-4">
      <div className="font-weight-bold">{title}</div>
      <div className="py-2">{children}</div>
    </div>
  );
};

function makeArgumentYaml(schema: Schema): string {
  let result = "";
  if (schema.type === "object") {
    for (const [prop, value] of Object.entries(schema.properties)) {
      if (typeof value !== "boolean") {
        result += `# ${prop}: ${value.type} (${
          schema.required.includes(prop) ? "required" : "optional"
        })\n`;
        if (value.description) {
          for (const line of value.description.split("\n")) {
            result += `# ${line} \n`;
          }
        }
        if (value.enum) {
          result += "# valid values:\n";
          for (const line of value.enum) {
            result += `# - ${line} \n`;
          }
        }
        result += `# ${prop.includes(" ") ? `"${prop}"` : prop}: \n`;
      }
    }
  }
  return result;
}

const BrickDetail: React.FunctionComponent<{ brick: IBlock }> = ({ brick }) => {
  const { addToast } = useToasts();

  return (
    <div>
      <div>
        <h3>{brick.name}</h3>
        <code className="p-0">{brick.id}</code>
      </div>

      <DetailSection title="Description">
        {brick.description ?? (
          <span className="text-muted">No description provided</span>
        )}
      </DetailSection>

      <DetailSection title="Input Schema">
        {!isEmpty(brick.inputSchema) ? (
          <div>
            <Button
              className="p-0"
              variant="link"
              onClick={() => {
                try {
                  copy(makeArgumentYaml(brick.inputSchema));
                  addToast("Copied input argument YAML to clipboard", {
                    appearance: "success",
                    autoDismiss: true,
                  });
                } catch (err) {
                  addToast("Error copying YAML to clipboard", {
                    appearance: "error",
                    autoDismiss: true,
                  });
                }
              }}
            >
              <FontAwesomeIcon icon={faClipboard} /> Copy Argument YAML
            </Button>
            <SchemaTree schema={brick.inputSchema} />
          </div>
        ) : (
          <div className="text-muted">No input schema provided</div>
        )}
      </DetailSection>

      <DetailSection title="Output Schema">
        {!isEmpty(brick.outputSchema) ? (
          <SchemaTree schema={brick.outputSchema} />
        ) : (
          <div className="text-muted">No output schema provided</div>
        )}
      </DetailSection>
    </div>
  );
};

const BlockResult: React.FunctionComponent<{
  block: IBlock;
  active?: boolean;
  onSelect: () => void;
}> = ({ block, onSelect, active }) => {
  const [type, setType] = useState<BlockType>(null);

  useAsyncEffect(async () => {
    setType(await getType(block));
  }, [block, setType]);

  return (
    <ListGroup.Item
      onClick={onSelect}
      className={cx("BlockResult", { active })}
    >
      <div className="d-flex">
        <div className="mr-2">
          <FontAwesomeIcon icon={getIcon(block, type)} />
        </div>
        <div className="flex-grow-1">
          <div className="d-flex BlockResult__title">
            <div className="flex-grow-1">{block.name}</div>
            <div className="flex-grow-0 BlockResult__badges">
              {block.id.startsWith("@pixiebrix/") && (
                <Badge variant="info">Official</Badge>
              )}
            </div>
          </div>
          <div className="BlockResult__id">
            <code className="small">{block.id}</code>
          </div>
        </div>
      </div>
    </ListGroup.Item>
  );
};

const BrickReference: React.FunctionComponent<{ blocks: IBlock[] }> = ({
  blocks,
}) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<IBlock>();

  const sortedBlocks = useMemo(() => {
    return sortBy(
      blocks ?? [],
      (x) => (x.id.startsWith("@pixiebrix") ? 0 : 1),
      (x) => x.name
    );
  }, [blocks]);

  useEffect(() => {
    if (sortedBlocks.length > 0 && selected == null) {
      setSelected(sortedBlocks[0]);
    }
  }, [sortedBlocks, selected, setSelected]);

  const fuse: Fuse<IBlock> = useMemo(() => {
    return new Fuse(sortedBlocks, {
      keys: ["name", "id"],
    });
  }, [blocks]);

  const [results] = useMemo(() => {
    const all =
      query.trim() === ""
        ? sortedBlocks
        : fuse.search(query).map((x) => x.item);
    return [all.slice(0, 10), all.length];
  }, [query, fuse, sortedBlocks]);

  return (
    <Container className="px-0 h-100" fluid>
      <Row className="h-100">
        <Col md={4} className="h-100">
          <Form>
            <InputGroup className="mr-sm-2">
              <InputGroup.Prepend>
                <InputGroup.Text>Search</InputGroup.Text>
              </InputGroup.Prepend>
              <Form.Control
                id="query"
                placeholder="Start typing to find results"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </InputGroup>
          </Form>
          <div className="overflow-auto h-100">
            <ListGroup className="BlockResults">
              {results.map((result) => (
                <BlockResult
                  key={result.id}
                  block={result}
                  active={selected?.id === result.id}
                  onSelect={() => setSelected(result)}
                />
              ))}
            </ListGroup>
          </div>
        </Col>
        <Col md={8} className="pt-4">
          {selected ? (
            <BrickDetail brick={selected} />
          ) : (
            <div>
              <GridLoader />
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default BrickReference;
