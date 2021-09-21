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
  Button,
  Col,
  Container,
  Form,
  InputGroup,
  ListGroup,
  Modal,
  Row,
} from "react-bootstrap";
import { sortBy, truncate, unary } from "lodash";
import { IBlock } from "@/core";
import { faExternalLinkAlt, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useDebounce } from "use-debounce";
import "./BlockModal.scss";
import { OfficialBadge } from "@/components/OfficialBadge";
import SchemaTree from "@/components/schemaTree/SchemaTree";
import QuickAdd from "@/devTools/editor/tabs/effect/QuickAdd";
import { MarketplaceListing } from "@/types/contract";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import BlockIcon from "@/components/BlockIcon";
import Fuse from "fuse.js";
import { isNullOrBlank } from "@/utils";
import { FixedSizeList as LazyList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import styles from "@/options/pages/brickEditor/referenceTab/BlockResult.module.scss";
import cx from "classnames";

const BlockResult: React.FunctionComponent<{
  block: IBlock;
  onSelect: () => void;
}> = ({ block, onSelect }) => (
  <ListGroup.Item onClick={onSelect} className={cx(styles.root)}>
    <div className="d-flex">
      <div className="mr-2 text-muted">
        <BlockIcon block={block} />
      </div>
      <div className={cx("flex-grow-1", styles.titleColumn)}>
        <div className={styles.ellipsis}>{block.name}</div>
        <code className={cx("small", styles.id)}>{block.id}</code>
        <p className={cx("small mb-0", styles.ellipsis)}>
          {/* FIXME: applying both truncate and the CSS ellipses style is redundant */}
          {/* Use a span if no description to ensure a consistent height for react-window */}
          {block.description ? (
            truncate(block.description, { length: 256 })
          ) : (
            <span>&nbsp;</span>
          )}
        </p>
      </div>
      <div className="flex-grow-0">
        <OfficialBadge id={block.id} />
      </div>
    </div>
  </ListGroup.Item>
);

type BlockOption = {
  block: IBlock;
  value: string;
  label: string;
};

function makeBlockOption(block: IBlock): BlockOption {
  return {
    value: block.id,
    label: block.name,
    block,
  };
}

const BlockDetail: React.FunctionComponent<{
  block: IBlock;
  listing?: MarketplaceListing;
  onSelect: () => void;
}> = ({ block, listing, onSelect }) => (
  <Row>
    <Col xs={12} className="d-flex justify-content-between">
      <div>
        <h4>
          {block.name} <BlockIcon block={block} />
        </h4>
        <code>{block.id}</code>
        <p>{block.description}</p>
        {listing && (
          <a
            href={`https://pixiebrix.com/marketplace/${listing.id}`}
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
  caption?: string | React.ReactNode;
  renderButton?: ({ show }: { show: () => void }) => React.ReactNode;
}> = ({ onSelect, blocks, caption = "Select a brick", renderButton }) => {
  const [show, setShow] = useState(false);
  const [query, setQuery] = useState("");
  const [detailBlock, setDetailBlock] = useState(null);
  const { data: listings = [] } = useGetMarketplaceListingsQuery();
  const [debouncedQuery] = useDebounce(query, 100, {
    trailing: true,
    leading: false,
  });

  const { fuse, blockOptions } = useMemo(() => {
    const blockOptions = sortBy(
      (blocks ?? []).map(unary(makeBlockOption)),
      (x) => x.label
    );
    const fuse: Fuse<BlockOption> = new Fuse(blockOptions, {
      keys: ["label", "block.id", "block.description"],
    });

    return { blockOptions, fuse };
  }, [blocks]);

  const searchResults = useMemo(
    () =>
      isNullOrBlank(debouncedQuery)
        ? blockOptions
        : fuse.search(debouncedQuery).map((x) => x.item),
    [debouncedQuery, fuse, blockOptions]
  );

  const close = useCallback(() => {
    setShow(false);
    // Reset the query for the next time it opens
    setQuery("");
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
                        <AutoSizer>
                          {({ height, width }) => (
                            <LazyList
                              height={height}
                              width={width}
                              itemCount={searchResults.length}
                              // The react-window library requires exact height
                              itemSize={87}
                              itemData={searchResults}
                            >
                              {({ index, style, data }) => {
                                // eslint-disable-next-line security/detect-object-injection -- index is a number
                                const { block } = data[index];
                                return (
                                  <div style={style}>
                                    <BlockResult
                                      key={block.id}
                                      block={block}
                                      onSelect={() => {
                                        setDetailBlock(block);
                                      }}
                                    />
                                  </div>
                                );
                              }}
                            </LazyList>
                          )}
                        </AutoSizer>
                      </div>
                    </Col>
                  </Row>
                </Col>
                <Col xs={7} className="BlockDetail" key={detailBlock?.id}>
                  {detailBlock ? (
                    <BlockDetail
                      block={detailBlock}
                      listing={listings.find(
                        (listing) => detailBlock.id === listing.package.name
                      )}
                      onSelect={() => {
                        onSelect(detailBlock);
                        close();
                      }}
                    />
                  ) : (
                    <QuickAdd
                      blocks={blocks}
                      onSelect={(block) => {
                        onSelect(block);
                        close();
                      }}
                    />
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
