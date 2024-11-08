/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import styles from "./AddBrickModal.module.scss";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { Button, Modal } from "react-bootstrap";
import { compact, isEmpty } from "lodash";
import { FixedSizeGrid as LazyGrid } from "react-window";
import AutoSizer, { type Size } from "react-virtualized-auto-sizer";
import { BRICK_ITEM_FIXED_HEIGHT_PX } from "./BrickGridItem";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faPlus } from "@fortawesome/free-solid-svg-icons";
import TagSearchInput from "./TagSearchInput";
import TagList, { type TagItem } from "./TagList";
import {
  useGetMarketplaceListingsQuery,
  useGetMarketplaceTagsQuery,
} from "@/data/service/api";
import { type MarketplaceListing } from "../../../types/contract";
import BrickDetail from "./BrickDetail";
import Loader from "@/components/Loader";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type Draft, produce } from "immer";
import { useDispatch, useSelector } from "react-redux";
import useTypedBrickMap from "@/bricks/hooks/useTypedBrickMap";
import useBrickSearch from "./useBrickSearch";
import BrickGridItemRenderer from "./BrickGridItemRenderer";
import groupListingsByTag from "./groupListingsByTag";
import { actions } from "../../store/editor/editorSlice";
import { selectEditorModalVisibilities } from "../../store/editor/editorSelectors";
import { BRICK_RESULT_COLUMN_COUNT, TAG_ALL } from "./addBrickModalConstants";
import {
  type BrickGridData,
  type BrickSelectOption,
} from "./addBrickModalTypes";
import { getItemKey } from "./addBrickModalHelpers";
import useAddBrick from "./useAddBrick";
import useTheme from "@/hooks/useTheme";
import aaLogo from "../../../../img/aa-logo-small.png";
import { scrollbarWidth } from "@xobotyi/scrollbar-width";
import { type RegistryId } from "../../../types/registryTypes";
import { type Brick } from "../../../types/brickTypes";
import useAsyncState from "@/hooks/useAsyncState";
import { AUTOMATION_ANYWHERE_PARTNER_KEY } from "@/data/service/constants";
import useFlags from "@/hooks/useFlags";
import { fallbackValue } from "../../../utils/asyncStateUtils";
import { type TypedBrickMap } from "@/bricks/registry";

const TAG_POPULAR = "Popular";
const TAG_UIPATH = "UiPath";

type State = {
  query: string;
  searchTag: string;
  scrollPosition: number;
  detailBrick: Brick | null;
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
    onSetDetailBrick(state, action: PayloadAction<Brick>) {
      state.detailBrick = action.payload as Draft<Brick>;
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
    resetState() {
      return initialState;
    },
  },
});

const EMPTY_BRICKS: TypedBrickMap = new Map();

const AddBrickModal: React.FC = () => {
  const { flagOn } = useFlags();
  const [state, dispatch] = useReducer(slice.reducer, initialState);

  const { isAddBlockModalVisible: show } = useSelector(
    selectEditorModalVisibilities,
  );

  const gridRef = useRef<LazyGrid>(null);

  const { data: allBricks } = fallbackValue(useTypedBrickMap(), EMPTY_BRICKS);

  const reduxDispatch = useDispatch();
  const closeModal = useCallback(() => {
    reduxDispatch(actions.hideModal());
    dispatch(slice.actions.resetState);
  }, [reduxDispatch]);

  const { testAddBrick, addBrick } = useAddBrick();

  const onSelectBrick = useCallback(
    async (brick: Brick) => {
      try {
        await addBrick(brick);
      } catch (error) {
        console.error(error);
      }

      closeModal();
    },
    [addBrick, closeModal],
  );

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

  const taggedBrickIds = useMemo(
    () => groupListingsByTag(marketplaceTags, listings),
    [marketplaceTags, listings],
  );

  const {
    activeTheme: { themeName },
  } = useTheme();

  const tagItems: TagItem[] = useMemo(() => {
    const items: TagItem[] = [{ tag: TAG_ALL }];
    if (themeName === AUTOMATION_ANYWHERE_PARTNER_KEY) {
      const aaTag = marketplaceTags.find(
        (tag) => tag.name === "Automation Anywhere",
      );
      if (aaTag) {
        items.push({
          tag: aaTag.name,
          svgIcon: aaLogo,
        });
      }
    }

    items.push(
      ...marketplaceTags
        .filter((tag) => tag.subtype === "role")
        .map((tag) => ({
          tag: tag.name,
          icon: tag.fa_icon,
        })),
    );

    return items;
  }, [marketplaceTags, themeName]);

  const filteredBricks = useMemo<Brick[]>(() => {
    if (isLoadingTags || isEmpty(allBricks)) {
      return [];
    }

    let typedBricks = [...allBricks.values()].filter(
      ({ block }) => block.featureFlag == null || flagOn(block.featureFlag),
    );

    if (themeName === AUTOMATION_ANYWHERE_PARTNER_KEY) {
      typedBricks = typedBricks.filter(
        // eslint-disable-next-line security/detect-object-injection -- constant
        (typed) => !taggedBrickIds[TAG_UIPATH]?.has(typed.block.id),
      );
    }

    return typedBricks.map(({ block }) => block);
  }, [allBricks, isLoadingTags, themeName, taggedBrickIds, flagOn]);

  const searchResults = useBrickSearch(
    filteredBricks,
    taggedBrickIds,
    state.query,
    state.searchTag,
  );

  const brickOptions = useMemo<BrickSelectOption[]>(() => {
    if (isEmpty(searchResults)) {
      return [];
    }

    const popular: BrickSelectOption[] = [];
    const regular: BrickSelectOption[] = [];

    for (const brickOption of searchResults) {
      // eslint-disable-next-line security/detect-object-injection -- constant
      if (taggedBrickIds[TAG_POPULAR]?.has(brickOption.brickResult.id)) {
        // Use immer to keep the class prototype and it's methods. There are downstream calls to runtime/getType which
        // depend on certain methods (e.g., transform, etc.) being present on the brick
        const newOption = produce(brickOption, (draft) => {
          draft.brickResult.isPopular = true;
        });
        // Do not sort popular bricks on top if the user has typed a search query
        if (isEmpty(state.query)) {
          popular.push(newOption);
        } else {
          regular.push(newOption);
        }
      } else {
        regular.push(brickOption);
      }
    }

    return [...popular, ...regular];
  }, [searchResults, state.query, taggedBrickIds]);

  const { data: invalidBrickMessages } = useAsyncState<
    BrickGridData["invalidBrickMessages"]
  >(
    async () =>
      new Map(
        compact(
          await Promise.all(
            brickOptions.map(
              async (
                brickOption,
              ): Promise<[RegistryId, React.ReactNode] | null> => {
                const result = await testAddBrick(brickOption.brickResult);
                if (result.error) {
                  return [brickOption.brickResult.id, result.error];
                }

                return null;
              },
            ),
          ),
        ),
      ),
    [brickOptions],
  );

  const gridData = useMemo<BrickGridData>(
    () => ({
      brickOptions,
      invalidBrickMessages:
        invalidBrickMessages ?? new Map<RegistryId, string>(),
      onSetDetailBrick(brick: Brick) {
        dispatch(slice.actions.onSetDetailBrick(brick));
      },
      onSelectBrick(brick: Brick) {
        void onSelectBrick(brick);
      },
    }),
    [brickOptions, invalidBrickMessages, onSelectBrick],
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
                name="brickSearch"
                value={state.query}
                onValueChange={(value) => {
                  dispatch(slice.actions.setQuery(value));
                }}
                placeholder="Search"
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
          [styles.brickDetail ?? ""]: state.detailBrick != null,
        })}
      >
        {state.detailBrick ? (
          <BrickDetail
            brick={state.detailBrick}
            listing={listings[state.detailBrick.id]}
            selectCaption={
              <span>
                <FontAwesomeIcon icon={faPlus} className="mr-1" /> Add brick
              </span>
            }
            onSelect={() => {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- existence checked above
              void addBrick(state.detailBrick!);
              closeModal();
            }}
          />
        ) : (
          <>
            <div
              className={cx(styles.tagList, {
                // Fit the "Automation Anywhere" tag name on one line
                [styles.widerTagList ?? ""]:
                  themeName === AUTOMATION_ANYWHERE_PARTNER_KEY,
              })}
            >
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
                  {({ height, width }: Size) => (
                    <LazyGrid
                      height={height}
                      width={width}
                      columnWidth={
                        (width - (scrollbarWidth() ?? 0)) /
                        BRICK_RESULT_COLUMN_COUNT
                      }
                      rowHeight={BRICK_ITEM_FIXED_HEIGHT_PX}
                      columnCount={BRICK_RESULT_COLUMN_COUNT}
                      rowCount={Math.ceil(
                        searchResults.length / BRICK_RESULT_COLUMN_COUNT,
                      )}
                      itemKey={getItemKey}
                      itemData={gridData}
                      onScroll={({ scrollTop }) => {
                        dispatch(slice.actions.setScrollPosition(scrollTop));
                      }}
                      ref={gridRef}
                    >
                      {BrickGridItemRenderer}
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

export default AddBrickModal;
