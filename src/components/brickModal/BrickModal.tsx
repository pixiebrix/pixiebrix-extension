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

import React, { CSSProperties, useCallback, useMemo, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { isEmpty, sortBy } from "lodash";
import { IBlock, IBrick, RegistryId } from "@/core";
import { useDebounce } from "use-debounce";
import Fuse from "fuse.js";
import { isNullOrBlank } from "@/utils";
import { FixedSizeGrid as LazyGrid } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import BrickResult, { BRICK_RESULT_FIXED_HEIGHT_PX } from "./BrickResult";
import { Except } from "type-fest";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faPlus } from "@fortawesome/free-solid-svg-icons";
import TagSearchInput from "@/components/brickModal/TagSearchInput";
import TagList, { TagItem } from "@/components/brickModal/TagList";
import {
  useGetMarketplaceListingsQuery,
  useGetMarketplaceTagsQuery,
} from "@/services/api";
import { MarketplaceListing } from "@/types/contract";
import BrickDetail from "@/components/brickModal/BrickDetail";
import Loader from "@/components/Loader";

const TAG_ALL = "All Categories";

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
  taggedBrickIds: Record<string, Set<string>>,
  query: string,
  searchTag: string | null
): Array<BrickOption<T>> {
  const [debouncedQuery] = useDebounce(query, 100, {
    trailing: true,
    leading: false,
  });

  const brickHasTag = useCallback(
    (brick: IBrick) => {
      if (searchTag == null || searchTag === TAG_ALL) {
        return true;
      }

      // eslint-disable-next-line security/detect-object-injection -- tag values come from the API
      return taggedBrickIds[searchTag].has(brick.id);
    },
    [searchTag, taggedBrickIds]
  );

  const { fuse, brickOptions } = useMemo(() => {
    const brickOptions = sortBy(
      (bricks ?? [])
        // We should never show @internal bricks to users. They'll sometimes find their way in from the registry
        .filter((x) => !x.id.startsWith("@internal/") && brickHasTag(x))
        .map((x) => makeBlockOption(x)),
      (x) => x.label
    );
    const fuse: Fuse<BrickOption<T>> = new Fuse(brickOptions, {
      keys: ["label", "data.id", "data.description"],
    });

    return { brickOptions, fuse };
  }, [brickHasTag, bricks]);

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
  close: () => void;
  modalClassName?: string;
};

type ButtonProps = {
  caption?: string | React.ReactNode;
  renderButton?: (onClick: () => void) => React.ReactNode;
};

type ItemType = {
  searchResults: BrickOption[];
  onSetDetailBrick: (brick: IBrick, rowIndex: number) => void;
  onSelect: (brick: IBrick) => void;
  close: () => void;
};

const RESULT_COLUMN_COUNT = 2;

function getFlatArrayIndex(rowIndex: number, columnIndex: number): number {
  // Layout items in the grid left to right, top to bottom
  return rowIndex * RESULT_COLUMN_COUNT + columnIndex;
}

// The item renderer must be its own separate component to react-window from re-mounting the results
// https://github.com/bvaughn/react-window/issues/420#issuecomment-585813335
const ItemRenderer = ({
  columnIndex,
  rowIndex,
  style,
  data: { searchResults, onSetDetailBrick, onSelect, close },
}: {
  columnIndex: number;
  rowIndex: number;
  style: CSSProperties;
  data: ItemType;
}) => {
  const index = getFlatArrayIndex(rowIndex, columnIndex);
  // eslint-disable-next-line security/detect-object-injection -- numeric value from library
  const { data: brick } = searchResults[index] ?? {};
  return (
    <div style={style}>
      {brick && (
        <BrickResult
          brick={brick}
          onShowDetail={() => {
            onSetDetailBrick(brick, rowIndex);
          }}
          onSelect={() => {
            onSelect(brick);
            close();
          }}
        />
      )}
    </div>
  );
};

// Need to provide a key because we reorder elements on search
// See https://react-window.vercel.app/#/api/FixedSizeGrid
type ItemKeyInput = {
  columnIndex: number;
  data: ItemType;
  rowIndex: number;
};
// Here, we use the brick id as the key, which is the "value" prop on the search result option
function itemKey({
  columnIndex,
  data: { searchResults },
  rowIndex,
}: ItemKeyInput): RegistryId | number {
  const resultIndex = getFlatArrayIndex(rowIndex, columnIndex);
  // Number of bricks for the last Grid row could be less than the number of columns
  // Returning the index here, ItemRenderer will render an empty cell
  if (resultIndex >= searchResults.length) {
    return resultIndex;
  }

  return searchResults[resultIndex]?.value;
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
  modalClassName,
}: ModalProps<T>): React.ReactElement<T> {
  const [query, setQuery] = useState("");
  const [detailBrick, setDetailBrick] = useState<T>(null);
  const [detailBrickRow, setDetailBrickRow] = useState(0);

  const refCallback = (element: LazyGrid) => {
    if (element != null && detailBrickRow > 0 && detailBrick == null) {
      element.scrollToItem({ rowIndex: detailBrickRow });
      setDetailBrickRow(0);
    }
  };

  const { data: marketplaceTags = [], isLoading: isLoadingTags } =
    useGetMarketplaceTagsQuery();
  const {
    data: listings = {} as Record<RegistryId, MarketplaceListing>,
    isLoading: isLoadingListings,
  } = useGetMarketplaceListingsQuery();

  const taggedBrickIds = useMemo<Record<string, Set<string>>>(() => {
    if (isEmpty(marketplaceTags) || isEmpty(listings)) {
      return {};
    }

    return Object.fromEntries(
      marketplaceTags.map((tag) => [
        tag.name,
        new Set(
          Object.entries(listings)
            .filter(([, listing]) =>
              listing.tags.some((lTag) => lTag.name === tag.name)
            )
            .map(([id]) => id)
        ),
      ])
    );
  }, [marketplaceTags, listings]);

  const tagItems: TagItem[] = [
    { tag: TAG_ALL },
    ...marketplaceTags
      .filter((tag) => tag.subtype === "role")
      .map((tag) => ({
        tag: tag.name,
        icon: tag.fa_icon,
      })),
  ];

  const [searchTag, setSearchTag] = useState<string>(TAG_ALL);

  const searchResults = useSearch(bricks, taggedBrickIds, query, searchTag);

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
      <Modal.Header className={styles.header}>
        {detailBrick ? (
          <Button
            variant="link"
            onClick={() => {
              setDetailBrick(null);
            }}
          >
            <FontAwesomeIcon icon={faChevronLeft} /> Back
          </Button>
        ) : (
          <>
            <Modal.Title className={styles.title}>Add Brick</Modal.Title>
            <div className={styles.searchContainer}>
              <TagSearchInput
                name={"brickSearch"}
                value={query}
                onValueChange={setQuery}
                placeholder={"Search"}
                tag={searchTag === TAG_ALL ? null : searchTag}
                onClearTag={() => {
                  setSearchTag(TAG_ALL);
                }}
                focusInput
                className={styles.searchInput}
              />
              {/* Copied from react-bootstrap's header close button */}
              <button
                type="button"
                onClick={close}
                className={cx("close", styles.closeButton)}
              >
                <span aria-hidden="true">×</span>
                <span className="sr-only">Close</span>
              </button>
            </div>
          </>
        )}
      </Modal.Header>
      <Modal.Body
        className={cx(styles.body, {
          [styles.brickDetail]: Boolean(detailBrick),
        })}
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
          <>
            <div className={styles.tagList}>
              {isLoadingTags ? (
                <Loader />
              ) : (
                <TagList
                  tagItems={tagItems}
                  activeTag={searchTag}
                  onSelectTag={setSearchTag}
                />
              )}
            </div>
            <div className={styles.brickResults}>
              {isLoadingListings ? (
                <Loader />
              ) : (
                <AutoSizer>
                  {({ height, width }) => (
                    <LazyGrid
                      height={height}
                      width={width}
                      columnWidth={width / RESULT_COLUMN_COUNT}
                      rowHeight={BRICK_RESULT_FIXED_HEIGHT_PX}
                      columnCount={RESULT_COLUMN_COUNT}
                      rowCount={Math.ceil(
                        searchResults.length / RESULT_COLUMN_COUNT
                      )}
                      itemKey={itemKey}
                      itemData={
                        {
                          searchResults,
                          onSetDetailBrick(brick: T, rowIndex: number) {
                            setDetailBrick(brick);
                            setDetailBrickRow(rowIndex);
                          },
                          activeBrick: detailBrick,
                          selectCaption,
                          onSelect,
                          close,
                        } as ItemType
                      }
                      ref={refCallback}
                    >
                      {ItemRenderer}
                    </LazyGrid>
                  )}
                </AutoSizer>
              )}
            </div>
          </>
        )}
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
