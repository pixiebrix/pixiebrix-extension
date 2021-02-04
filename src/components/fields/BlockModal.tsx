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

import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  ListGroup,
  Button,
  Col,
  Form,
  InputGroup,
  Row,
  Container,
  Badge,
} from "react-bootstrap";
import { sortBy, truncate } from "lodash";
import { IBlock } from "@/core";
import {
  faBookReader,
  faCube,
  faMagic,
  faRandom,
  faWindowMaximize,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { BlockType, getType } from "@/blocks/util";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import useAsyncEffect from "use-async-effect";
import { useDebounce } from "use-debounce";

import "./BlockModal.scss";

function getIcon(type: BlockType): IconProp {
  switch (type) {
    case "reader":
      return faBookReader;
    case "transform":
      return faRandom;
    case "effect":
      return faMagic;
    case "renderer":
      return faWindowMaximize;
    default:
      return faCube;
  }
}

const BlockResult: React.FunctionComponent<{
  block: IBlock;
  onSelect: () => void;
}> = ({ block, onSelect }) => {
  const [type, setType] = useState<BlockType>(null);

  useAsyncEffect(async () => {
    setType(await getType(block));
  }, [block, setType]);

  return (
    <ListGroup.Item onClick={onSelect}>
      <div className="d-flex">
        <div className="mr-2">
          <FontAwesomeIcon icon={getIcon(type)} />
        </div>
        <div className="flex-grow-1">
          <div className="d-flex BlockModal__title">
            <div className="flex-grow-1">{block.name}</div>
            <div className="flex-grow-0 BlockModal__badges">
              {block.id.startsWith("@pixiebrix/") && (
                <Badge variant="info">Official</Badge>
              )}
            </div>
          </div>
          <div className="BlockModal__id">
            <code className="small">{block.id}</code>
          </div>
          <div>
            <p className="mb-0 small">
              {truncate(block.description, { length: 256 })}
            </p>
          </div>
        </div>
      </div>
    </ListGroup.Item>
  );
};

const BlockModal: React.FunctionComponent<{
  onSelect: (service: IBlock) => void;
  blocks: IBlock[];
  caption?: string;
}> = ({ onSelect, blocks, caption = "Select a brick" }) => {
  const [show, setShow] = useState(false);
  const [query, setQuery] = useState("");

  const [debouncedQuery] = useDebounce(query, 100, { trailing: true });

  const blockOptions = useMemo(
    () =>
      (blocks ?? []).map((x) => ({
        value: x.id,
        label: x.name,
        block: x,
      })),
    [blocks]
  );

  const filteredOptions = useMemo(() => {
    if (debouncedQuery.trim() != "") {
      const normalQuery = debouncedQuery.toLowerCase();
      return sortBy(
        blockOptions.filter(
          (x) =>
            x.label.toLowerCase().includes(normalQuery) ||
            (x.block.description ?? "").toLowerCase().includes(normalQuery)
        ),
        (x) => x.label
      );
    } else {
      return sortBy(blockOptions, (x) => x.label);
    }
  }, [blockOptions, debouncedQuery]);

  const close = useCallback(() => {
    setShow(false);
  }, [setShow]);

  return (
    <div>
      {show && (
        <Modal
          className="BlockModal"
          show={show}
          size="lg"
          onHide={close}
          backdrop={true}
          keyboard={false}
        >
          <Modal.Header closeButton>
            <Modal.Title>{caption}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Container>
              <Row>
                <Col>
                  <Form>
                    <InputGroup className="mb-2 mr-sm-2">
                      <InputGroup.Prepend>
                        <InputGroup.Text>Search</InputGroup.Text>
                      </InputGroup.Prepend>
                      <Form.Control
                        placeholder="Start typing to find results"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </InputGroup>
                  </Form>
                </Col>
              </Row>
              <Row>
                <Col>
                  <div className="BlockModal__results">
                    <ListGroup>
                      {filteredOptions.map((x) => (
                        <BlockResult
                          key={x.block.id}
                          block={x.block}
                          onSelect={() => {
                            onSelect(x.block);
                            // reset the query for the next time it opens
                            setQuery("");
                            close();
                          }}
                        />
                      ))}
                    </ListGroup>
                  </div>
                </Col>
              </Row>
            </Container>
          </Modal.Body>
        </Modal>
      )}
      <Button variant="info" onClick={() => setShow(true)}>
        {caption}
      </Button>
    </div>
  );
};

export default BlockModal;
