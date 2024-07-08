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

import styles from "./BrickModal.module.scss";

import React, {
  type CSSProperties,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button,
  // eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
  Form,
  InputGroup,
  Modal,
} from "react-bootstrap";
import { compact, sortBy } from "lodash";
import { useDebounce } from "use-debounce";
import { useGetMarketplaceListingsQuery } from "@/data/service/api";
import Fuse from "fuse.js";
import { FixedSizeList as LazyList } from "react-window";
import AutoSizer, { type Size } from "react-virtualized-auto-sizer";
import BrickResult from "./BrickResult";
import BrickDetail from "./BrickDetail";
import QuickAdd from "@/components/brickModalNoTags/QuickAdd";
import { type Except } from "type-fest";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import useAutoFocusConfiguration from "@/hooks/useAutoFocusConfiguration";
import { type PackageInstance, type RegistryId } from "@/types/registryTypes";
import { type Brick } from "@/types/brickTypes";
import { isNullOrBlank } from "@/utils/stringUtils";
import useOnMountOnly from "@/hooks/useOnMountOnly";
import { freeze } from "@/utils/objectUtils";

type BrickOption<T extends PackageInstance = Brick> = {
  data: T;
  value: RegistryId;
  label: string;
};

function makeBlockOption<T extends PackageInstance>(brick: T): BrickOption<T> {
  return {
    value: brick.id,
    label: brick.name,
    data: brick,
  };
}

function useSearch<T extends PackageInstance>(
  bricks: T[],
  query: string,
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
      (x) => x.label,
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
    [debouncedQuery, fuse, brickOptions],
  );
}

type ModalProps<T extends PackageInstance = Brick> = {
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

type ItemType<T extends PackageInstance> = {
  searchResults: Array<BrickOption<T>>;
  setDetailBrick: (brick: T) => void;
  selectCaption: React.ReactNode;
  onSelect: (brick: T) => void;
  close: () => void;
  activeBrick: T | null;
};

// The item renderer must be its own separate component to react-window from re-mounting the results
// https://github.com/bvaughn/react-window/issues/420#issuecomment-585813335
const ItemRenderer = <T extends PackageInstance>({
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
  data: ItemType<T>;
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
function itemKey<T extends PackageInstance>(
  index: number,
  { searchResults }: ItemType<T>,
): RegistryId {
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

const DEFAULT_RECOMMENDATIONS = freeze<RegistryId[]>([]);

function ActualModal<T extends PackageInstance>({
  bricks,
  close,
  onSelect,
  selectCaption = defaultAddCaption,
  recommendations = DEFAULT_RECOMMENDATIONS,
  modalClassName,
}: ModalProps<T>): React.ReactElement<T> {
  const [query, setQuery] = useState("");
  const [detailBrick, setDetailBrick] = useState<T>(null);
  const searchInput = useRef(null);
  // The react-window library requires exact height
  const brickResultSizePx = 87;

  // Auto-focus search input upon opening Modal
  useAutoFocusConfiguration({ elementRef: searchInput, focus: true });

  const { data: listings = {} } = useGetMarketplaceListingsQuery();

  const searchResults = useSearch(bricks ?? [], query);

  const recommendedBricks = useMemo(() => {
    if (recommendations.length === 0) {
      return;
    }

    // Retain the same order that the recommendations were passed in
    const brickMap = new Map((bricks ?? []).map((brick) => [brick.id, brick]));
    return compact(
      recommendations.map((registryId) => brickMap.get(registryId)),
    );
  }, [recommendations, bricks]);

  useOnMountOnly(() => {
    // If there's no recommendations, default to the first brick so the right side isn't blank
    if (recommendations.length === 0 && searchResults.length > 0) {
      setDetailBrick(searchResults[0].data);
    }
  });

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
      <Modal.Body className={cx(styles.body, "gap-4")}>
        <div className="d-flex flex-column gap-3">
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
          <div className="flex-grow-1">
            <AutoSizer>
              {({ height, width }: Size) => (
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
                    } as ItemType<T>
                  }
                >
                  {ItemRenderer}
                </LazyList>
              )}
            </AutoSizer>
          </div>
        </div>
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
              onSelect(brick);
              close();
            }}
            recommendations={recommendedBricks}
          />
        )}
      </Modal.Body>
    </Modal>
  );
}

function BrickModal<T extends PackageInstance>({
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
