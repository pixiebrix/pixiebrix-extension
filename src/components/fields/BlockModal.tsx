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
} from "react-bootstrap";
import { sortBy, truncate, unary } from "lodash";
import { IBlock, IService } from "@/core";
import {
  fas,
  faBars,
  faBolt,
  faBookReader,
  faCloud,
  faColumns,
  faCube,
  faMagic,
  faMousePointer,
  faRandom,
  faWindowMaximize,
  faExternalLinkAlt,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { BlockType, getType } from "@/blocks/util";
import { useAsyncEffect } from "use-async-effect";
import { useDebounce } from "use-debounce";

import "./BlockModal.scss";
import { TriggerExtensionPoint } from "@/extensionPoints/triggerExtension";
import { MenuItemExtensionPoint } from "@/extensionPoints/menuItemExtension";
import { ContextMenuExtensionPoint } from "@/extensionPoints/contextMenu";
import { PanelExtensionPoint } from "@/extensionPoints/panelExtension";
import { ActionPanelExtensionPoint } from "@/extensionPoints/actionPanelExtension";
import { OfficialBadge } from "@/components/OfficialBadge";

import useFetch from "@/hooks/useFetch";

import { library, IconProp } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import SchemaTree from "@/components/schemaTree/SchemaTree";
import QuickAdd from "@/devTools/editor/tabs/effect/QuickAdd";

// TODO: Unable to use dynamic font awesome icons without importing them first
//  maybe there is a better way to do this?
library.add(fas, fab, far);

export function getIcon(block: IBlock | IService, type: BlockType): IconProp {
  if ("schema" in block) {
    return faCloud;
  }

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
      break;
  }

  if (block instanceof TriggerExtensionPoint) {
    return faBolt;
  }

  if (block instanceof MenuItemExtensionPoint) {
    return faMousePointer;
  }

  if (block instanceof ContextMenuExtensionPoint) {
    return faBars;
  }

  if (block instanceof PanelExtensionPoint) {
    return faWindowMaximize;
  }

  if (block instanceof ActionPanelExtensionPoint) {
    return faColumns;
  }

  return faCube;
}

const BlockIcon: React.FunctionComponent<{
  block: IBlock;
  listing?: MarketplaceListing;
}> = ({ block, listing }) => {
  const [type, setType] = useState<BlockType>(null);

  useAsyncEffect(async () => {
    setType(await getType(block));
  }, [block, setType]);

  const fa_icon = useMemo(() => {
    if (listing?.fa_icon) {
      // The fa_icon database value includes the css class e.g. far, fab, etc.
      const icon = listing.fa_icon.split(" ");
      icon[1] = icon[1].replace("fa-", "");
      return icon as IconProp;
    }

    return getIcon(block, type);
  }, [block, type, listing]);

  return (
    <>
      {listing?.image == null ? (
        <FontAwesomeIcon
          icon={fa_icon}
          color={listing?.icon_color}
          className={`${listing?.icon_color ? "" : "text-muted"}`}
          fixedWidth
        />
      ) : (
        // Setting height and width to 1em allows for scaling with font size
        <svg width="1em" height="1em">
          <image xlinkHref={listing?.image.url} width="1em" height="1em" />
        </svg>
      )}
    </>
  );
};

const BlockResult: React.FunctionComponent<{
  block: IBlock;
  listing?: MarketplaceListing;
  onSelect: () => void;
}> = ({ block, onSelect, listing }) => (
  <ListGroup.Item onClick={onSelect}>
    <div className="d-flex">
      <div className="mr-2 text-muted">
        <BlockIcon listing={listing} block={block} />
      </div>
      <div className="flex-grow-1">
        <div className="d-flex BlockModal__title">
          <div className="flex-grow-1">{block.name}</div>
          <div className="flex-grow-0 BlockModal__badges">
            <OfficialBadge id={block.id} />
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

type BlockOption = {
  block: IBlock;
  value: string;
  label: string;
};

function searchBlocks(query: string, options: BlockOption[]): BlockOption[] {
  let filtered = options;
  if (query?.trim() !== "") {
    const normalizedQuery = query.toLowerCase();
    filtered = options.filter(
      (x) =>
        x.label.toLowerCase().includes(normalizedQuery) ||
        x.block.id.includes(normalizedQuery) ||
        (x.block.description ?? "").toLowerCase().includes(normalizedQuery)
    );
  }

  return sortBy(filtered, (x) => x.label);
}

function makeBlockOption(block: IBlock): BlockOption {
  return {
    value: block.id,
    label: block.name,
    block,
  };
}

// Would this type be swagger auto-generated?
type MarketplaceListing = {
  id: string;
  package: Record<string, unknown>;
  fa_icon: string;
  icon_color: string;
  image?: Record<string, string>;
};

const BlockDetail: React.FunctionComponent<{
  block: IBlock;
  listing?: MarketplaceListing;
  onSelect: () => void;
}> = ({ block, listing, onSelect }) => (
  <Row>
    <Col xs={12} className="d-flex justify-content-between">
      <div>
        <h4>
          {block.name} <BlockIcon block={block} listing={listing} />
        </h4>
        <code>{block.id}</code>
        <p>{block.description}</p>
        {listing && (
          <a
            href={"https://pixiebrix.com/marketplace/" + listing.id}
            className="text-info mr-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1" />
            View in Marketplace
          </a>
        )}
      </div>
      <div>
        <Button variant="primary mr-1 text-nowrap" onClick={onSelect}>
          <FontAwesomeIcon icon={faPlus} className="mr-1" />
          Add brick
        </Button>
      </div>
    </Col>
    <Col xs={12}>
      <h5 className="my-3">Input Schema</h5>
      <SchemaTree schema={block.inputSchema} />
      <h5 className="my-3">Output Schema</h5>
      <SchemaTree schema={block.outputSchema} />
    </Col>
  </Row>
);

const BlockModal: React.FunctionComponent<{
  onSelect: (service: IBlock) => void;
  blocks: IBlock[];
  recommendedBricks?: string[];
  caption?: string | React.ReactNode;
  renderButton?: ({ show }: { show: () => void }) => React.ReactNode;
}> = ({ onSelect, blocks, caption = "Select a brick", renderButton }) => {
  const [show, setShow] = useState(false);
  const [query, setQuery] = useState("");
  const [detailBlock, setDetailBlock] = useState(null);
  const { data: listings = [] } = useFetch<MarketplaceListing[]>(
    "/api/marketplace/listings/?show_detail=true"
  );
  const [debouncedQuery] = useDebounce(query, 100, { trailing: true });

  const blockOptions = useMemo(
    () => (blocks ?? []).map(unary(makeBlockOption)),
    [blocks]
  );

  const filteredOptions = useMemo(
    () => searchBlocks(debouncedQuery, blockOptions),
    [blockOptions, debouncedQuery]
  );

  const close = useCallback(() => {
    setShow(false);
    setDetailBlock(null);
  }, [setShow]);

  return (
    <>
      {show && (
        <Modal
          className="BlockModal"
          show={show}
          size="xl"
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
                <Col xs={5}>
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
                            onChange={(e) => {
                              setQuery(e.target.value);
                            }}
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
                              listing={listings.find(
                                (listing) => x.block.id === listing.package.name
                              )}
                              onSelect={() => {
                                setDetailBlock(x.block);
                              }}
                            />
                          ))}
                        </ListGroup>
                      </div>
                    </Col>
                  </Row>
                </Col>
                <Col xs={7} className="BlockDetail">
                  {detailBlock ? (
                    <BlockDetail
                      block={detailBlock}
                      listing={listings.find(
                        (listing) => detailBlock.id === listing.package.name
                      )}
                      onSelect={() => {
                        onSelect(detailBlock);
                        // Reset the query for the next time it opens
                        setQuery("");
                        setDetailBlock(null);
                        close();
                      }}
                    />
                  ) : (
                    <QuickAdd blocks={blocks} onSelect={onSelect} />
                  )}
                </Col>
              </Row>
            </Container>
          </Modal.Body>
        </Modal>
      )}

      {renderButton ? (
        renderButton({
          show: () => {
            setShow(true);
          },
        })
      ) : (
        <Button
          variant="info"
          onClick={() => {
            setShow(true);
          }}
        >
          {caption}
        </Button>
      )}
    </>
  );
};

export default BlockModal;
