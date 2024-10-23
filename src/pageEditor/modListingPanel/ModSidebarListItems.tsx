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

import styles from "./ModSidebarListItems.module.scss";
import React, { useMemo, useState } from "react";
import { Accordion, Button, FormControl, ListGroup } from "react-bootstrap";
import { type SidebarItem } from "@/pageEditor/modListingPanel/common";
import ModListItem from "@/pageEditor/modListingPanel/ModListItem";
import arrangeSidebarItems from "@/pageEditor/modListingPanel/arrangeSidebarItems";
import { useSelector } from "react-redux";
import ModComponentListItem from "./ModComponentListItem";
import { useDebounce } from "use-debounce";
import filterSidebarItems from "@/pageEditor/modListingPanel/filterSidebarItems";
import { getDraftModComponentId } from "@/pageEditor/utils";
import {
  selectActiveModComponentId,
  selectActiveModId,
  selectExpandedModId,
  selectNotDeletedActivatedModComponents,
  selectNotDeletedModComponentFormStates,
  selectModComponentAvailability,
} from "@/pageEditor/store/editor/editorSelectors";

const ModSidebarListItems: React.FunctionComponent = () => {
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

  const listItems = filteredSidebarItems.map((sidebarItem) => {
    const { modMetadata, modComponents } = sidebarItem;

    return (
      <ModListItem key={modMetadata.id} modMetadata={modMetadata}>
        {modComponents.map((modComponentSidebarItem) => (
          <ModComponentListItem
            key={getDraftModComponentId(modComponentSidebarItem)}
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

export default ModSidebarListItems;
