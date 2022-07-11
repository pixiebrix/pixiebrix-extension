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

import styles from "./AddBlockModal.module.scss";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { Button, Modal } from "react-bootstrap";
import { isEmpty } from "lodash";
import { IBlock, RegistryId } from "@/core";
import { FixedSizeGrid as LazyGrid } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { BLOCK_ITEM_FIXED_HEIGHT_PX } from "./BlockGridItem";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faPlus } from "@fortawesome/free-solid-svg-icons";
import TagSearchInput from "@/components/addBlockModal/TagSearchInput";
import TagList, { TagItem } from "@/components/addBlockModal/TagList";
import {
  useGetMarketplaceListingsQuery,
  useGetMarketplaceTagsQuery,
} from "@/services/api";
import { MarketplaceListing } from "@/types/contract";
import BlockDetail from "@/components/addBlockModal/BlockDetail";
import Loader from "@/components/Loader";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { produce } from "immer";
import { useDispatch, useSelector } from "react-redux";
import { PipelineType } from "@/pageEditor/pageEditorTypes";
import useAllBlocks from "@/pageEditor/hooks/useAllBlocks";
import useBlockSearch from "@/components/addBlockModal/useBlockSearch";
import BlockGridItemRenderer from "@/components/addBlockModal/BlockGridItemRenderer";
import groupListingsByTag from "@/components/addBlockModal/groupListingsByTag";
import { actions } from "@/pageEditor/slices/editorSlice";
import {
  selectActiveElement,
  selectAddBlockLocation,
  selectIsAddBlockModalVisible,
} from "@/pageEditor/slices/editorSelectors";
import { makeBlockFilterPredicate } from "@/pageEditor/tabs/editTab/blockFilterHelpers";
import {
  BLOCK_RESULT_COLUMN_COUNT,
  TAG_ALL,
} from "@/components/addBlockModal/addBlockModalConstants";
import {
  BlockGridData,
  BlockOption,
} from "@/components/addBlockModal/addBlockModalTypes";
import { getItemKey } from "@/components/addBlockModal/addBlockModalHelpers";
import useAddBlock from "@/components/addBlockModal/useAddBlock";

type State = {
  query: string;
  searchTag: string;
  scrollPosition: number;
  detailBlock: IBlock | null;
  scrollTo: number | null;
};

const initialState: State = {
  query: "",
  searchTag: TAG_ALL,
  scrollPosition: 0,
  detailBlock: null,
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
    onSetDetailBlock(state, action: PayloadAction<IBlock>) {
      state.detailBlock = action.payload;
      state.scrollTo = state.scrollPosition;
    },
    onClearDetailBlock(state) {
      state.detailBlock = null;
    },
    onClearScrollTo(state) {
      state.scrollTo = null;
    },
    onClearSearchTag(state) {
      state.searchTag = TAG_ALL;
      state.scrollTo = 0;
    },
    resetState() {
      return initialState;
    },
  },
});

const AddBlockModal: React.VFC = () => {
  const show = useSelector(selectIsAddBlockModalVisible);
  const [state, dispatch] = useReducer(slice.reducer, initialState);

  const gridRef = useRef<LazyGrid>();

  const [allBlocks, isLoadingAllBlocks] = useAllBlocks();

  const reduxDispatch = useDispatch();
  const closeModal = useCallback(() => {
    reduxDispatch(actions.hideModal());
    dispatch(slice.actions.resetState);
  }, [reduxDispatch]);

  const addBlockLocation = useSelector(selectAddBlockLocation);
  const pipelinePath = addBlockLocation?.path ?? "";
  const pipelineType = addBlockLocation?.type ?? PipelineType.Root;
  const pipelineIndex = addBlockLocation?.index ?? 0;
  const activeElement = useSelector(selectActiveElement);
  const extensionPointType = activeElement?.extensionPoint?.definition?.type;

  const addBlock = useAddBlock(pipelinePath, pipelineIndex);

  const onSelectBlock = useCallback(
    async (block: IBlock) => {
      try {
        await addBlock(block);
        closeModal();
      } catch (error) {
        console.error(error);
      }
    },
    [addBlock, closeModal]
  );

  const blockFilterPredicate = useMemo(
    () =>
      makeBlockFilterPredicate(pipelineType, pipelinePath, extensionPointType),
    [extensionPointType, pipelinePath, pipelineType]
  );

  const filteredBlocks = useMemo<IBlock[]>(() => {
    if (isLoadingAllBlocks) {
      return [];
    }

    return [...allBlocks.entries()]
      .filter(([_, typedBlock]) => blockFilterPredicate(typedBlock))
      .map(([_, { block }]) => block);
  }, [allBlocks, blockFilterPredicate, isLoadingAllBlocks]);

  useEffect(() => {
    if (!gridRef.current) {
      return;
    }

    if (
      state.scrollTo != null &&
      state.scrollPosition !== state.scrollTo &&
      state.detailBlock == null
    ) {
      const scrollTo = { scrollTop: state.scrollTo };
      dispatch(slice.actions.onClearScrollTo());
      gridRef.current.scrollTo(scrollTo);
    }
  }, [state.detailBlock, state.scrollPosition, state.scrollTo]);

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

  const searchResults = useBlockSearch(
    filteredBlocks,
    taggedBrickIds,
    state.query,
    state.searchTag
  );

  const blockOptions = useMemo<BlockOption[]>(() => {
    if (isEmpty(searchResults)) {
      return [];
    }

    const popular: BlockOption[] = [];
    const regular: BlockOption[] = [];

    for (const blockOption of searchResults) {
      if (popularBrickIds.has(blockOption.blockResult.id)) {
        // Use immer to keep the class prototype and it's methods. There are downstream calls to runtime/getType which
        // depend on certain methods (e.g., transform, etc.) being present on the brick
        const newOption = produce(blockOption, (draft) => {
          draft.blockResult.isPopular = true;
        });
        // Do not sort popular bricks on top if the user has typed a search query
        if (isEmpty(state.query)) {
          popular.push(newOption);
        } else {
          regular.push(newOption);
        }
      } else {
        regular.push(blockOption);
      }
    }

    return [...popular, ...regular];
  }, [popularBrickIds, searchResults, state.query]);

  const gridData = useMemo<BlockGridData>(
    () => ({
      blockOptions,
      onSetDetailBlock(block: IBlock) {
        dispatch(slice.actions.onSetDetailBlock(block));
      },
      onSelectBlock(block: IBlock) {
        void onSelectBlock(block);
      },
    }),
    [blockOptions, onSelectBlock]
  );

  return (
    <Modal
      className={styles.root}
      show={show}
      centered
      size="xl"
      onHide={closeModal}
      backdrop
      keyboard={false}
    >
      <Modal.Header className={styles.header}>
        {state.detailBlock ? (
          <Button
            variant="link"
            onClick={() => {
              dispatch(slice.actions.onClearDetailBlock());
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
            </div>
          </>
        )}
        {/* Copied from react-bootstrap's header close button */}
        <button
          type="button"
          onClick={closeModal}
          className={cx("close", styles.closeButton)}
        >
          <span aria-hidden="true">×</span>
          <span className="sr-only">Close</span>
        </button>
      </Modal.Header>
      <Modal.Body
        className={cx(styles.body, {
          [styles.blockDetail]: state.detailBlock != null,
        })}
      >
        {state.detailBlock ? (
          <BlockDetail
            block={state.detailBlock}
            listing={listings[state.detailBlock.id]}
            selectCaption={
              <span>
                <FontAwesomeIcon icon={faPlus} className="mr-1" /> Add brick
              </span>
            }
            onSelect={() => {
              void addBlock(state.detailBlock);
              closeModal();
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
                      columnWidth={(width - 15) / BLOCK_RESULT_COLUMN_COUNT} // 15px to make space for scrollbars
                      rowHeight={BLOCK_ITEM_FIXED_HEIGHT_PX}
                      columnCount={BLOCK_RESULT_COLUMN_COUNT}
                      rowCount={Math.ceil(
                        searchResults.length / BLOCK_RESULT_COLUMN_COUNT
                      )}
                      itemKey={getItemKey}
                      itemData={gridData}
                      onScroll={({ scrollTop }) => {
                        dispatch(slice.actions.setScrollPosition(scrollTop));
                      }}
                      ref={gridRef}
                    >
                      {BlockGridItemRenderer}
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
};

export default AddBlockModal;
