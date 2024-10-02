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

import styles from "./ModComponents.module.scss";
import React, { useMemo, useState } from "react";
import { Accordion, Button, FormControl, ListGroup } from "react-bootstrap";
import {
  getModComponentItemId,
  isModSidebarItem,
  type SidebarItem,
} from "@/pageEditor/modListingPanel/common";
import ModListItem from "@/pageEditor/modListingPanel/ModListItem";
import arrangeSidebarItems from "@/pageEditor/modListingPanel/arrangeSidebarItems";
import {
  selectActiveModComponentId,
  selectActiveModId,
  selectExpandedModId,
  selectModComponentAvailability,
  selectNotDeletedModComponentFormStates,
  selectNotDeletedActivatedModComponents,
} from "@/pageEditor/store/editor/editorSelectors";
import { useDispatch, useSelector } from "react-redux";
import useSaveMod from "@/pageEditor/hooks/useSaveMod";
import useResetMod from "@/pageEditor/hooks/useResetMod";
import useDeactivateMod from "@/pageEditor/hooks/useDeactivateMod";
import ModComponentListItem from "./ModComponentListItem";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { useDebounce } from "use-debounce";
import filterSidebarItems from "@/pageEditor/modListingPanel/filterSidebarItems";

const ModComponents: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const activeModComponentId = useSelector(selectActiveModComponentId);
  const activeModId = useSelector(selectActiveModId);
  const expandedModId = useSelector(selectExpandedModId);
  const cleanModComponents = useSelector(
    selectNotDeletedActivatedModComponents,
  );
  const modComponentFormStates = useSelector(
    selectNotDeletedModComponentFormStates,
  );
  const { availableActivatedModComponentIds, availableDraftModComponentIds } =
    useSelector(selectModComponentAvailability);

  const [filterQuery, setFilterQuery] = useState("");
  const [debouncedFilterQuery] = useDebounce(filterQuery.toLowerCase(), 250, {
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

  const { save: saveMod, isSaving: isSavingMod } = useSaveMod();
  const resetMod = useResetMod();
  const deactivateMod = useDeactivateMod();

  const listItems = filteredSidebarItems.map((sidebarItem) => {
    if (isModSidebarItem(sidebarItem)) {
      const { modMetadata, modComponents } = sidebarItem;
      return (
        <ModListItem
          key={modMetadata.id}
          modMetadata={modMetadata}
          onSave={async () => {
            await saveMod(modMetadata.id);
          }}
          isSaving={isSavingMod}
          onReset={async () => {
            await resetMod(modMetadata.id);
          }}
          onDeactivate={async () => {
            await deactivateMod({ modId: modMetadata.id });
          }}
          onClone={async () => {
            dispatch(actions.showCreateModModal({ keepLocalCopy: true }));
          }}
        >
          {modComponents.map((modComponentSidebarItem) => (
            <ModComponentListItem
              key={getModComponentItemId(modComponentSidebarItem)}
              modComponentSidebarItem={modComponentSidebarItem}
              availableActivatedModComponentIds={
                availableActivatedModComponentIds
              }
              availableDraftModComponentIds={availableDraftModComponentIds}
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
        availableActivatedModComponentIds={availableActivatedModComponentIds}
        availableDraftModComponentIds={availableDraftModComponentIds}
      />
    );
  });

  return (
    <>
      {/* Quick Filter */}
      <div className={styles.filter}>
        <FormControl
          placeholder="Quick filter"
          value={filterQuery}
          onChange={({ target }) => {
            setFilterQuery(target.value);
          }}
        />
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

      {/* Mod Component List */}
      <Accordion activeKey={expandedModId ?? undefined} className={styles.list}>
        <ListGroup>{listItems}</ListGroup>
      </Accordion>
    </>
  );
};

export default ModComponents;
