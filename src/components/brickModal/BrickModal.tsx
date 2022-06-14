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
  useReducer,
  useRef,
  useState,
} from "react";
import { Button, Modal } from "react-bootstrap";
import { isEmpty, sortBy } from "lodash";
import { IBlock, IBrick, RegistryId } from "@/core";
import { useDebounce } from "use-debounce";
import Fuse from "fuse.js";
import { isNullOrBlank } from "@/utils";
import { FixedSizeGrid as LazyGrid } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import BrickResultItem, {
  BRICK_RESULT_FIXED_HEIGHT_PX,
  BrickResult,
} from "./BrickResultItem";
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
import { MarketplaceListing, MarketplaceTag } from "@/types/contract";
import BrickDetail from "@/components/brickModal/BrickDetail";
import Loader from "@/components/Loader";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const TAG_ALL = "All Categories";

const POPULAR_BRICK_TAG_ID = "35367896-b38f-447e-9444-ecfecb258468";

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
        // We should never show @internal bricks to users. They'll sometimes find their way in from the registry.
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

type BrickResultsArray<T extends IBrick> = Array<BrickOption<BrickResult<T>>>;

type ItemType<T extends IBrick> = {
  brickResults: BrickResultsArray<T>;
  onSetDetailBrick: (brick: IBrick) => void;
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
const ItemRenderer = <T extends IBrick>({
  columnIndex,
  rowIndex,
  style,
  data: { brickResults, onSetDetailBrick, onSelect, close },
}: {
  columnIndex: number;
  rowIndex: number;
  style: CSSProperties;
  data: ItemType<T>;
}) => {
  const index = getFlatArrayIndex(rowIndex, columnIndex);
  // eslint-disable-next-line security/detect-object-injection -- numeric value from library
  const brickResult = brickResults[index]?.data;

  return (
    <div style={style}>
      {brickResult && (
        <BrickResultItem
          brick={brickResult}
          onShowDetail={() => {
            onSetDetailBrick(brickResult);
          }}
          onSelect={() => {
            onSelect(brickResult);
            close();
          }}
        />
      )}
    </div>
  );
};

// Need to provide a key because we reorder elements on search
// See https://react-window.vercel.app/#/api/FixedSizeGrid
type ItemKeyInput<T extends IBrick> = {
  columnIndex: number;
  data: ItemType<T>;
  rowIndex: number;
};
// Here, we use the brick id as the key, which is the "value" prop on the search result option
function itemKey<T extends IBrick>({
  columnIndex,
  data: { brickResults },
  rowIndex,
}: ItemKeyInput<T>): RegistryId | number {
  const resultIndex = getFlatArrayIndex(rowIndex, columnIndex);
  // Number of bricks for the last Grid row could be less than the number of columns
  // Returning the index here, ItemRenderer will render an empty cell
  if (resultIndex >= brickResults.length) {
    return resultIndex;
  }

  // eslint-disable-next-line security/detect-object-injection -- index is a number
  return brickResults[resultIndex]?.value;
}

const defaultAddCaption = (
  <span>
    <FontAwesomeIcon icon={faPlus} className="mr-1" /> Add
  </span>
);

function groupListingsByTag(
  marketplaceTags: MarketplaceTag[],
  listings: Record<RegistryId, MarketplaceListing>
): {
  /**
   * A record with tag names as the keys, and a set of applicable brick registry ids as the values
   */
  taggedBrickIds: Record<string, Set<RegistryId>>;

  /**
   * A set of brick ids that have been tagged as "popular"
   */
  popularBrickIds: Set<RegistryId>;
} {
  if (isEmpty(marketplaceTags) || isEmpty(listings)) {
    return {
      taggedBrickIds: {},
      popularBrickIds: new Set<RegistryId>(),
    };
  }

  const categoryTags = marketplaceTags.filter((tag) => tag.subtype === "role");

  const taggedBrickIds = Object.fromEntries(
    categoryTags.map((tag) => [tag.name, new Set<RegistryId>()])
  );
  const popularBrickIds = new Set<RegistryId>();

  for (const [id, listing] of Object.entries(listings)) {
    const registryId = id as RegistryId;

    for (const listingTag of listing.tags) {
      if (listingTag.id === POPULAR_BRICK_TAG_ID) {
        popularBrickIds.add(registryId);
      }

      taggedBrickIds[listingTag.name]?.add(registryId);
    }
  }

  return { taggedBrickIds, popularBrickIds };
}

type State = {
  query: string;
  searchTag: string;
  scrollPosition: number;
  detailBrick: IBrick | null;
  scrollTo: number | null;
};

const initialState: State = {
  query: "",
  searchTag: TAG_ALL,
  scrollPosition: 0,
  detailBrick: null,
  scrollTo: null,
};

const slice = createSlice({
  name: "brickModalSlice",
  initialState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
      state.scrollTo = 0;
    },
    setSearchTag(state, action: PayloadAction<string>) {
      state.searchTag = action.payload;
      state.scrollTo = 0;
    },
    setScrollPosition(state, action: PayloadAction<number>) {
      state.scrollPosition = action.payload;
    },
    onSetDetailBrick(state, action: PayloadAction<IBrick>) {
      state.detailBrick = action.payload;
      state.scrollTo = state.scrollPosition;
    },
    onClearDetailBrick(state) {
      state.detailBrick = null;
    },
    onClearScrollTo(state) {
      state.scrollTo = null;
    },
    onClearSearchTag(state) {
      state.searchTag = TAG_ALL;
      state.scrollTo = 0;
    },
  },
});

function ActualModal<T extends IBrick>({
  bricks = [],
  close,
  onSelect,
  selectCaption = defaultAddCaption,
  modalClassName,
}: ModalProps<T>): React.ReactElement<T> {
  const [state, dispatch] = useReducer(slice.reducer, initialState);

  const gridRef = useRef<LazyGrid>();

  useEffect(() => {
    if (!gridRef.current) {
      return;
    }

    if (
      state.scrollTo != null &&
      state.scrollPosition !== state.scrollTo &&
      state.detailBrick == null
    ) {
      const scrollTo = { scrollTop: state.scrollTo };
      dispatch(slice.actions.onClearScrollTo());
      gridRef.current.scrollTo(scrollTo);
    }
  }, [state.detailBrick, state.scrollPosition, state.scrollTo]);

  const { data: marketplaceTags = [], isLoading: isLoadingTags } =
    useGetMarketplaceTagsQuery();
  const {
    data: listings = {} as Record<RegistryId, MarketplaceListing>,
    isLoading: isLoadingListings,
  } = useGetMarketplaceListingsQuery();

  const { taggedBrickIds, popularBrickIds } = useMemo(
    () => groupListingsByTag(marketplaceTags, listings),
    [marketplaceTags, listings]
  );

  const tagItems: TagItem[] = [
    { tag: TAG_ALL },
    ...marketplaceTags
      .filter((tag) => tag.subtype === "role")
      .map((tag) => ({
        tag: tag.name,
        icon: tag.fa_icon,
      })),
  ];

  const searchResults = useSearch(
    bricks,
    taggedBrickIds,
    state.query,
    state.searchTag
  );

  const brickResults = useMemo<BrickResultsArray<T>>(() => {
    if (isEmpty(searchResults)) {
      return [];
    }

    const popular: BrickResultsArray<T> = [];
    const regular: BrickResultsArray<T> = [];

    for (const result of searchResults) {
      if (popularBrickIds.has(result.data.id)) {
        popular.push({
          ...result,
          data: {
            ...result.data,
            isPopular: true,
          },
        });
      } else {
        regular.push(result);
      }
    }

    return [...popular, ...regular];
  }, [popularBrickIds, searchResults]);

  const itemData = useMemo<ItemType<T>>(
    () => ({
      brickResults,
      onSetDetailBrick(brick: T) {
        dispatch(slice.actions.onSetDetailBrick(brick));
      },
      onSelect,
      close,
    }),
    [brickResults, close, onSelect]
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
      <Modal.Header className={styles.header}>
        {state.detailBrick ? (
          <Button
            variant="link"
            onClick={() => {
              dispatch(slice.actions.onClearDetailBrick());
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
                value={state.query}
                onValueChange={(value) => {
                  dispatch(slice.actions.setQuery(value));
                }}
                placeholder={"Search"}
                tag={state.searchTag === TAG_ALL ? null : state.searchTag}
                onClearTag={() => {
                  dispatch(slice.actions.onClearSearchTag());
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
          [styles.brickDetail]: state.detailBrick != null,
        })}
      >
        {state.detailBrick ? (
          <BrickDetail
            brick={state.detailBrick}
            listing={listings[state.detailBrick.id]}
            selectCaption={selectCaption}
            onSelect={() => {
              onSelect(state.detailBrick as T);
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
                  activeTag={state.searchTag}
                  onSelectTag={(tag) => {
                    dispatch(slice.actions.setSearchTag(tag));
                  }}
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
                      columnWidth={(width - 15) / RESULT_COLUMN_COUNT} // 15px to make space for scrollbars
                      rowHeight={BRICK_RESULT_FIXED_HEIGHT_PX}
                      columnCount={RESULT_COLUMN_COUNT}
                      rowCount={Math.ceil(
                        searchResults.length / RESULT_COLUMN_COUNT
                      )}
                      itemKey={itemKey}
                      itemData={itemData}
                      onScroll={({ scrollTop }) => {
                        dispatch(slice.actions.setScrollPosition(scrollTop));
                      }}
                      ref={gridRef}
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
