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
  useState,
} from "react";
import { Button, Col, Container, Modal, Row } from "react-bootstrap";
import { sortBy } from "lodash";
import { IBlock, IBrick, RegistryId } from "@/core";
import { useDebounce } from "use-debounce";
import Fuse from "fuse.js";
import { isNullOrBlank } from "@/utils";
import { FixedSizeList as LazyList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import BrickResult from "./BrickResult";
import { Except } from "type-fest";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faEdit,
  faFileUpload,
  faKeyboard,
  faNewspaper,
  faPlus,
  faRecycle,
  faSave,
  faSyncAlt,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import TagSearchInput from "@/components/brickModal/TagSearchInput";
import TagList from "@/components/brickModal/TagList";
import { brickHasTag, Tag } from "@/components/brickModal/brickTags";

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
  query: string,
  searchTag: string | null
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
        .filter((x) => brickHasTag(x, searchTag))
        .map((x) => makeBlockOption(x)),
      (x) => x.label
    );
    const fuse: Fuse<BrickOption<T>> = new Fuse(brickOptions, {
      keys: ["label", "data.id", "data.description"],
    });

    return { brickOptions, fuse };
  }, [bricks, searchTag]);

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
  // eslint-disable-next-line security/detect-object-injection -- numeric value from library
  const { data: brick } = searchResults[index];
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
  // eslint-disable-next-line security/detect-object-injection -- numeric value
  const item = searchResults[index];

  // Return a value that uniquely identifies this item.
  // Typically this will be a UID of some sort.
  return item.value;
}

const defaultAddCaption = (
  <span>
    <FontAwesomeIcon icon={faPlus} className="mr-1" /> Add
  </span>
);

const defaultTag = Tag.ALL;
const tagItems = [
  {
    tag: Tag.ALL,
  },
  {
    tag: Tag.EXTRACT,
    icon: faFileUpload,
  },
  {
    tag: Tag.COLLECT,
    icon: faKeyboard,
  },
  {
    tag: Tag.AUTOMATE,
    icon: faBolt,
  },
  {
    tag: Tag.TRANSFORM,
    icon: faRecycle,
  },
  {
    tag: Tag.INTEGRATE,
    icon: faSyncAlt,
  },
  {
    tag: Tag.COLLABORATE,
    icon: faUsers,
  },
  {
    tag: Tag.STORE,
    icon: faSave,
  },
  {
    tag: Tag.MODIFY,
    icon: faEdit,
  },
  {
    tag: Tag.SHOW,
    icon: faNewspaper,
  },
];

function ActualModal<T extends IBrick>({
  bricks = [],
  close,
  onSelect,
  selectCaption = defaultAddCaption,
  recommendations = [],
  modalClassName,
}: ModalProps<T>): React.ReactElement<T> {
  const [query, setQuery] = useState("");
  const [searchTag, setSearchTag] = useState<string>(defaultTag);
  const [detailBrick, setDetailBrick] = useState<T>(null);
  // The react-window library requires exact height
  const brickResultSizePx = 87;

  const searchResults = useSearch(bricks, query, searchTag);

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
      <Modal.Header closeButton>
        <Container fluid>
          <Row>
            <Col xs={2}>
              <Modal.Title className={styles.title}>Add brick</Modal.Title>
            </Col>
            <Col xs={10}>
              <TagSearchInput
                name={"brickSearch"}
                value={query}
                onValueChange={setQuery}
                placeholder={"Search"}
                tag={searchTag === defaultTag ? null : searchTag}
                onClearTag={() => {
                  setSearchTag(defaultTag);
                }}
                focusInput
                className={styles.searchInput}
              />
            </Col>
          </Row>
        </Container>
      </Modal.Header>
      <Modal.Body className={styles.body}>
        <Container fluid>
          <Row>
            <Col xs={2}>
              <TagList
                tagItems={tagItems}
                activeTag={searchTag}
                onSelectTag={setSearchTag}
              />
            </Col>
            <Col
              xs={10}
              className={cx(styles.brickDetail)}
              key={detailBrick?.id}
            >
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
