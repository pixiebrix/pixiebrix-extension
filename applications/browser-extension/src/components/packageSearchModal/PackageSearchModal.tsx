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

import styles from "./PackageSearchModal.module.scss";

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
import PackageResult from "./PackageResult";
import PackageDetail from "./PackageDetail";
import QuickAdd from "./QuickAdd";
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
import { assertNotNullish } from "@/utils/nullishUtils";

type PackageOption<Instance extends PackageInstance = Brick> = {
  data: Instance;
  value: RegistryId;
  label: string;
};

function mapToPackageOption<Instance extends PackageInstance>(
  packageInstance: Instance,
): PackageOption<Instance> {
  return {
    value: packageInstance.id,
    label: packageInstance.name,
    data: packageInstance,
  };
}

function useSearch<Instance extends PackageInstance>(
  packageInstances: Instance[],
  query: string,
): Array<PackageOption<Instance>> {
  const [debouncedQuery] = useDebounce(query, 100, {
    trailing: true,
    leading: false,
  });

  const { fuse, packageOptions } = useMemo(() => {
    const packageOptions = sortBy(
      // We should never show @internal bricks to users. However, they'll sometimes find their way in from the registry
      (packageInstances ?? [])
        .filter((x) => !x.id.startsWith("@internal/"))
        .map((x) => mapToPackageOption(x)),
      (x) => x.label,
    );
    const fuse = new Fuse<PackageOption<Instance>>(packageOptions, {
      keys: ["label", "data.id", "data.description"],
    });

    return { packageOptions, fuse };
  }, [packageInstances]);

  return useMemo(
    () =>
      isNullOrBlank(debouncedQuery)
        ? packageOptions
        : fuse.search(debouncedQuery).map((x) => x.item),
    [debouncedQuery, fuse, packageOptions],
  );
}

type ModalProps<Instance extends PackageInstance = Brick> = {
  packageInstances: Instance[];
  onSelect: (packageInstance: Instance) => void;
  selectCaption?: React.ReactNode;
  recommendations?: RegistryId[];
  close: () => void;
  modalClassName?: string;
};

type ButtonProps = {
  caption?: string | React.ReactNode;
  renderButton?: (onClick: () => void) => React.ReactNode;
};

type ItemType<Instance extends PackageInstance> = {
  searchResults: Array<PackageOption<Instance>>;
  setDetailPackage: (packageInstance: Instance) => void;
  selectCaption: React.ReactNode;
  onSelect: (brick: Instance) => void;
  close: () => void;
  activePackage: Instance | null;
};

// The item renderer must be its own separate component to react-window from re-mounting the results
// https://github.com/bvaughn/react-window/issues/420#issuecomment-585813335
const ItemRenderer = <Instance extends PackageInstance>({
  index,
  style,
  data: {
    searchResults,
    setDetailPackage,
    selectCaption,
    onSelect,
    close,
    activePackage,
  },
}: {
  index: number;
  style: CSSProperties;
  data: ItemType<Instance>;
}) => {
  const { data: packageInstance } = searchResults.at(index) ?? {};
  assertNotNullish(packageInstance, "Package instance should not be nullish");

  return (
    <div style={style}>
      <PackageResult
        packageInstance={packageInstance}
        onShowDetail={() => {
          setDetailPackage(packageInstance);
        }}
        onSelect={() => {
          onSelect(packageInstance);
          close();
        }}
        selectCaption={selectCaption}
        active={activePackage?.id === packageInstance.id}
      />
    </div>
  );
};

// Need to provide a key because we reorder elements on search
// See https://react-window.vercel.app/#/api/FixedSizeList
function itemKey<Instance extends PackageInstance>(
  index: number,
  { searchResults }: ItemType<Instance>,
): RegistryId {
  // Find the item at the specified index.
  // In this case "data" is an Array that was passed to List as "itemData".
  const item = searchResults.at(index);
  assertNotNullish(item, "item not found in searchResults");

  // Return a value that uniquely identifies this item.
  // Typically, this will be a UID of some sort.
  return item.value;
}

const defaultAddCaption = (
  <span>
    <FontAwesomeIcon icon={faPlus} className="mr-1" /> Add
  </span>
);

const DEFAULT_RECOMMENDATIONS = freeze<RegistryId[]>([]);

function ActualModal<Instance extends PackageInstance>({
  packageInstances,
  close,
  onSelect,
  selectCaption = defaultAddCaption,
  recommendations = DEFAULT_RECOMMENDATIONS,
  modalClassName,
}: ModalProps<Instance>): React.ReactElement<Instance> {
  const [query, setQuery] = useState("");
  const [detailPackage, setDetailPackage] = useState<Instance | null>(null);
  const searchInput = useRef(null);
  // The react-window library requires exact height
  const brickResultSizePx = 87;

  // Auto-focus search input upon opening Modal
  useAutoFocusConfiguration({ elementRef: searchInput, focus: true });

  const { data: listings = {} } = useGetMarketplaceListingsQuery();

  const searchResults = useSearch(packageInstances ?? [], query);

  const recommendedPackages = useMemo(() => {
    if (recommendations.length === 0) {
      return;
    }

    // Retain the same order that the recommendations were passed in
    const packageMap = new Map((packageInstances ?? []).map((x) => [x.id, x]));
    return compact(
      recommendations.map((registryId) => packageMap.get(registryId)),
    );
  }, [recommendations, packageInstances]);

  useOnMountOnly(() => {
    // If there's no recommendations, default to the first brick so the right side isn't blank
    if (recommendations.length === 0 && searchResults[0]) {
      setDetailPackage(searchResults[0].data);
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
                      setDetailPackage,
                      activePackage: detailPackage,
                      selectCaption,
                      onSelect,
                      close,
                    } as ItemType<Instance>
                  }
                >
                  {ItemRenderer}
                </LazyList>
              )}
            </AutoSizer>
          </div>
        </div>
        {detailPackage ? (
          <PackageDetail
            packageInstance={detailPackage}
            listing={listings[detailPackage.id]}
            selectCaption={selectCaption}
            onSelect={() => {
              onSelect(detailPackage);
              close();
            }}
          />
        ) : (
          <QuickAdd
            onSelect={(packageInstance) => {
              onSelect(packageInstance);
              close();
            }}
            recommendations={recommendedPackages}
          />
        )}
      </Modal.Body>
    </Modal>
  );
}

/**
 * A package search modal, without support for filtering by Marketplace tags.
 *
 * For the Page Editor brick modal, see `AddBrickModal`.
 *
 * @see AddBrickModal
 */
function PackageSearchModal<Instance extends PackageInstance>({
  caption,
  renderButton,
  ...modalProps
}: Except<ModalProps<Instance>, "close"> &
  ButtonProps): React.ReactElement<Instance> {
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

export default PackageSearchModal;
