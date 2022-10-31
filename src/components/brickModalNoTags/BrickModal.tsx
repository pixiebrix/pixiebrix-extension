/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import styles from "./BrickModal.module.scss";

import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button,
  Col,
  Container,
  Form,
  InputGroup,
  Modal,
  Row,
} from "react-bootstrap";
import { compact, sortBy } from "lodash";
import { IBlock, IBrick, RegistryId } from "@/core";
import { useDebounce } from "use-debounce";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import Fuse from "fuse.js";
import { isNullOrBlank } from "@/utils";
import { FixedSizeList as LazyList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import BrickResult from "./BrickResult";
import BrickDetail from "./BrickDetail";
import QuickAdd from "@/components/brickModalNoTags/QuickAdd";
import { Except } from "type-fest";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

type BrickOption<T extends IBrick = IBlock> = {
  data: T;
  value: RegistryId;
  label: string;
};

function makeBlockOption<T extends IBrick>(brick: T): BrickOption<T> {
  return {
    value: brick.id,
    label: brick.name,
    data: brick,
  };
}

function useSearch<T extends IBrick>(
  bricks: T[],
  query: string
): Array<BrickOption<T>> {
  const [debouncedQuery] = useDebounce(query, 100, {
    trailing: true,
    leading: false,
  });

  const { fuse, brickOptions } = useMemo(() => {
    const brickOptions = sortBy(
      // We should never show @internal bricks to users. However, they'll sometimes find their way in from the registry
      (bricks ?? [])
        .filter((x) => !x.id.startsWith("@internal/"))
        .map((x) => makeBlockOption(x)),
      (x) => x.label
    );
    const fuse = new Fuse<BrickOption<T>>(brickOptions, {
      keys: ["label", "data.id", "data.description"],
    });

    return { brickOptions, fuse };
  }, [bricks]);

  return useMemo(
    () =>
      isNullOrBlank(debouncedQuery)
        ? brickOptions
        : fuse.search(debouncedQuery).map((x) => x.item),
    [debouncedQuery, fuse, brickOptions]
  );
}

type ModalProps<T extends IBrick = IBlock> = {
  bricks: T[];
  onSelect: (brick: T) => void;
  selectCaption?: React.ReactNode;
  recommendations?: RegistryId[];
  close: () => void;
  modalClassName?: string;
};

type ButtonProps = {
  caption?: string | React.ReactNode;
  renderButton?: (onClick: () => void) => React.ReactNode;
};

type ItemType = {
  searchResults: BrickOption[];
  setDetailBrick: (brick: IBrick) => void;
  selectCaption: React.ReactNode;
  onSelect: (brick: IBrick) => void;
  close: () => void;
  activeBrick: IBrick | null;
};

// The item renderer must be its own separate component to react-window from re-mounting the results
// https://github.com/bvaughn/react-window/issues/420#issuecomment-585813335
const ItemRenderer = ({
  index,
  style,
  data: {
    searchResults,
    setDetailBrick,
    selectCaption,
    onSelect,
    close,
    activeBrick,
  },
}: {
  index: number;
  style: CSSProperties;
  data: ItemType;
}) => {
  const { data: brick } = searchResults.at(index);
  return (
    <div style={style}>
      <BrickResult
        brick={brick}
        onShowDetail={() => {
          setDetailBrick(brick);
        }}
        onSelect={() => {
          onSelect(brick);
          close();
        }}
        selectCaption={selectCaption}
        active={activeBrick?.id === brick.id}
      />
    </div>
  );
};

// Need to provide a key because we reorder elements on search
// See https://react-window.vercel.app/#/api/FixedSizeList
function itemKey(index: number, { searchResults }: ItemType): RegistryId {
  // Find the item at the specified index.
  // In this case "data" is an Array that was passed to List as "itemData".
  const item = searchResults.at(index);

  // Return a value that uniquely identifies this item.
  // Typically this will be a UID of some sort.
  return item.value;
}

const defaultAddCaption = (
  <span>
    <FontAwesomeIcon icon={faPlus} className="mr-1" /> Add
  </span>
);

function ActualModal<T extends IBrick>({
  bricks = [],
  close,
  onSelect,
  selectCaption = defaultAddCaption,
  recommendations = [],
  modalClassName,
}: ModalProps<T>): React.ReactElement<T> {
  const [query, setQuery] = useState("");
  const [detailBrick, setDetailBrick] = useState<T>(null);
  const searchInput = useRef(null);
  // The react-window library requires exact height
  const brickResultSizePx = 87;

  // Auto-focus search input upon opening Modal
  useEffect(() => {
    searchInput.current.focus();
  }, []);

  const { data: listings = {} } = useGetMarketplaceListingsQuery();

  const searchResults = useSearch(bricks, query);

  const recommendedBricks = useMemo(() => {
    if (recommendations.length === 0) {
      return;
    }

    // Retain the same order that the recommendations were passed in
    const brickMap = new Map(bricks.map((brick) => [brick.id, brick]));
    return compact(
      recommendations.map((registryId) => brickMap.get(registryId))
    );
  }, [recommendations, bricks]);

  useEffect(
    () => {
      // If there's no recommendations, default to the first brick so the right side isn't blank
      if (recommendations.length === 0 && searchResults.length > 0) {
        setDetailBrick(searchResults[0].data);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run on initial mount
    []
  );

  return (
    <Modal
      className={cx(styles.root, modalClassName)}
      show
      centered
      size="xl"
      onHide={close}
      backdrop
      keyboard={false}
    >
      <Modal.Body className={styles.body}>
        <Container fluid>
          <Row>
            <Col xs={5} className={styles.results}>
              <Form>
                <InputGroup>
                  <InputGroup.Prepend>
                    <InputGroup.Text>Search</InputGroup.Text>
                  </InputGroup.Prepend>
                  <Form.Control
                    ref={searchInput}
                    placeholder="Start typing to find results"
                    value={query}
                    onChange={({ target }) => {
                      setQuery(target.value);
                    }}
                  />
                </InputGroup>
              </Form>
              <div>
                <AutoSizer>
                  {({ height, width }) => (
                    <LazyList
                      height={height}
                      width={width}
                      itemCount={searchResults.length}
                      itemSize={brickResultSizePx}
                      itemKey={itemKey}
                      itemData={
                        {
                          searchResults,
                          setDetailBrick,
                          activeBrick: detailBrick,
                          selectCaption,
                          onSelect,
                          close,
                        } as ItemType
                      }
                    >
                      {ItemRenderer}
                    </LazyList>
                  )}
                </AutoSizer>
              </div>
            </Col>
            <Col
              xs={7}
              className={cx(styles.brickDetail)}
              key={detailBrick?.id}
            >
              {detailBrick ? (
                <BrickDetail
                  brick={detailBrick}
                  listing={listings[detailBrick.id]}
                  selectCaption={selectCaption}
                  onSelect={() => {
                    onSelect(detailBrick);
                    close();
                  }}
                />
              ) : (
                <QuickAdd
                  onSelect={(brick) => {
                    // XXX: need to rewrite the signature of QuickAdd to work with generics
                    onSelect(brick as T);
                    close();
                  }}
                  recommendations={recommendedBricks}
                />
              )}
            </Col>
          </Row>
        </Container>
      </Modal.Body>
    </Modal>
  );
}

function BrickModal<T extends IBrick>({
  caption = "Select a Brick",
  renderButton,
  ...modalProps
}: Except<ModalProps<T>, "close"> & ButtonProps): React.ReactElement<T> {
  const [show, setShow] = useState(false);

  const close = useCallback(() => {
    setShow(false);
  }, [setShow]);

  return (
    <>
      {show && <ActualModal {...modalProps} close={close} />}

      {renderButton ? (
        renderButton(() => {
          setShow(true);
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
}

export default BrickModal;
