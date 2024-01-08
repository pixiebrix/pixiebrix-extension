/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import styles from "./Sidebar.module.scss";
import React, { useMemo, useState } from "react";
import {
  Accordion,
  Button,
  FormControl,
  InputGroup,
  ListGroup,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  getModComponentItemId,
  isModSidebarItem,
  type SidebarItem,
} from "@/pageEditor/sidebar/common";
import { faAngleDoubleLeft } from "@fortawesome/free-solid-svg-icons";
import cx from "classnames";
import ModListItem from "@/pageEditor/sidebar/ModListItem";
import useFlags from "@/hooks/useFlags";
import arrangeSidebarItems from "@/pageEditor/sidebar/arrangeSidebarItems";
import {
  selectActiveElementId,
  selectActiveRecipeId,
  selectExpandedRecipeId,
  selectExtensionAvailability,
  selectNotDeletedElements,
  selectNotDeletedExtensions,
} from "@/pageEditor/slices/editorSelectors";
import { useDispatch, useSelector } from "react-redux";
import useSaveRecipe from "@/pageEditor/hooks/useSaveRecipe";
import useResetRecipe from "@/pageEditor/hooks/useResetRecipe";
import useDeactivateMod from "@/pageEditor/hooks/useDeactivateMod";
import HomeButton from "./HomeButton";
import ReloadButton from "./ReloadButton";
import AddStarterBrickButton from "./AddStarterBrickButton";
import ModComponentListItem from "./ModComponentListItem";
import { actions } from "@/pageEditor/slices/editorSlice";
import { useDebounce } from "use-debounce";
import { lowerCase } from "lodash";
import filterSidebarItems from "@/pageEditor/sidebar/filterSidebarItems";

const SidebarExpanded: React.FunctionComponent<{
  collapseSidebar: () => void;
}> = ({ collapseSidebar }) => {
  const dispatch = useDispatch();
  const activeModComponentId = useSelector(selectActiveElementId);
  const activeModId = useSelector(selectActiveRecipeId);
  const expandedModId = useSelector(selectExpandedRecipeId);
  const cleanModComponents = useSelector(selectNotDeletedExtensions);
  const modComponentFormStates = useSelector(selectNotDeletedElements);
  const { availableInstalledIds, availableDynamicIds } = useSelector(
    selectExtensionAvailability,
  );

  const { flagOn } = useFlags();
  const showDeveloperUI =
    process.env.ENVIRONMENT === "development" ||
    flagOn("page-editor-developer");

  const [filterQuery, setFilterQuery] = useState("");
  const [debouncedFilterQuery] = useDebounce(lowerCase(filterQuery), 250, {
    trailing: true,
    leading: false,
  });

  const sortedSidebarItems = useMemo<SidebarItem[]>(
    () =>
      arrangeSidebarItems({
        modComponentFormStates,
        cleanModComponents,
      }),
    [modComponentFormStates, cleanModComponents],
  );

  const filteredSidebarItems = useMemo<SidebarItem[]>(
    () =>
      filterSidebarItems({
        sidebarItems: sortedSidebarItems,
        filterText: debouncedFilterQuery,
        activeModId,
        activeModComponentId,
      }),
    [
      activeModComponentId,
      activeModId,
      debouncedFilterQuery,
      sortedSidebarItems,
    ],
  );

  const { save: saveRecipe, isSaving: isSavingRecipe } = useSaveRecipe();
  const resetRecipe = useResetRecipe();
  const deactivateMod = useDeactivateMod();

  const listItems = filteredSidebarItems.map((sidebarItem) => {
    if (isModSidebarItem(sidebarItem)) {
      const { modMetadata, modComponents } = sidebarItem;
      return (
        <ModListItem
          key={modMetadata.id}
          modMetadata={modMetadata}
          onSave={async () => {
            await saveRecipe(activeModId);
          }}
          isSaving={isSavingRecipe}
          onReset={async () => {
            await resetRecipe(activeModId);
          }}
          onDeactivate={async () => {
            await deactivateMod({ modId: activeModId });
          }}
          onClone={async () => {
            dispatch(actions.showCreateRecipeModal({ keepLocalCopy: true }));
          }}
        >
          {modComponents.map((modComponentSidebarItem) => (
            <ModComponentListItem
              key={getModComponentItemId(modComponentSidebarItem)}
              modComponentSidebarItem={modComponentSidebarItem}
              availableInstalledIds={availableInstalledIds}
              availableDynamicIds={availableDynamicIds}
              isNested
            />
          ))}
        </ModListItem>
      );
    }

    return (
      <ModComponentListItem
        key={getModComponentItemId(sidebarItem)}
        modComponentSidebarItem={sidebarItem}
        availableInstalledIds={availableInstalledIds}
        availableDynamicIds={availableDynamicIds}
      />
    );
  });

  return (
    <div className={cx(styles.root, styles.expanded)}>
      <div className={styles.header}>
        <div className={styles.actions}>
          <div className={styles.actionsLeft}>
            <HomeButton />

            <AddStarterBrickButton />

            {showDeveloperUI && <ReloadButton />}
          </div>
          <Button
            variant="light"
            className={styles.toggle}
            type="button"
            onClick={collapseSidebar}
          >
            <FontAwesomeIcon icon={faAngleDoubleLeft} fixedWidth />
          </Button>
        </div>
      </div>

      {/* Quick Filter */}
      <div className={styles.searchWrapper}>
        <div className={styles.searchContainer}>
          <InputGroup>
            <FormControl
              placeholder="Quick filter"
              value={filterQuery}
              onChange={({ target }) => {
                setFilterQuery(target.value);
              }}
            />
          </InputGroup>
          {filterQuery.length > 0 ? (
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setFilterQuery("");
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {/* Extension List */}
      <div className={styles.extensions}>
        <Accordion activeKey={expandedModId}>
          <ListGroup>{listItems}</ListGroup>
        </Accordion>
      </div>
    </div>
  );
};

export default SidebarExpanded;
