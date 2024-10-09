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

import React, { type PropsWithChildren } from "react";
import styles from "./Entry.module.scss";
import { ModHasUpdateIcon } from "@/pageEditor/modListingPanel/ModComponentIcons";
import { Accordion, ListGroup } from "react-bootstrap";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCaretDown,
  faCaretRight,
  faFile,
} from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import cx from "classnames";
import {
  selectActiveModComponentFormState,
  selectActiveModId,
  selectDirtyMetadataForModId,
  selectExpandedModId,
  selectModIsDirty,
} from "@/pageEditor/store/editor/editorSelectors";
import * as semver from "semver";
import { useGetModDefinitionQuery } from "@/data/service/api";
import useAddNewModComponent from "@/pageEditor/hooks/useAddNewModComponent";
import { type ModMetadata } from "@/types/modComponentTypes";
import { isInnerDefinitionRegistryId } from "@/types/helpers";
import ModActionMenu from "@/pageEditor/modListingPanel/ModActionMenu";

export type ModListItemProps = PropsWithChildren<{
  modMetadata: ModMetadata;
  onSave: () => Promise<void>;
  onClearChanges: () => Promise<void>;
  onMakeCopy: () => Promise<void>;
}>;

const ModListItem: React.FC<ModListItemProps> = ({
  modMetadata,
  children,
  onSave,
  onClearChanges,
  onMakeCopy,
}) => {
  const dispatch = useDispatch();
  const activeModId = useSelector(selectActiveModId);
  const expandedModId = useSelector(selectExpandedModId);
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  const addNewModComponent = useAddNewModComponent(modMetadata);

  const { id: modId, name: savedName, version: activatedVersion } = modMetadata;
  const isActive = activeModId === modId;

  // TODO: Fix this so it pulls from registry, after registry single-item-api-fetch is implemented
  //        (See: https://github.com/pixiebrix/pixiebrix-extension/issues/7184)
  const { data: modDefinition } = useGetModDefinitionQuery({ modId });
  const latestModVersion = modDefinition?.metadata?.version;

  // Set the alternate background if a mod component in this mod is active
  const hasModBackground =
    activeModComponentFormState?.modMetadata.id === modId;

  const dirtyName = useSelector(selectDirtyMetadataForModId(modId))?.name;
  const name = dirtyName ?? savedName ?? "Loading...";
  const isDirty = useSelector(selectModIsDirty(modId));

  const isUnsavedMod = isInnerDefinitionRegistryId(modMetadata.id);

  const hasUpdate =
    latestModVersion != null &&
    activatedVersion != null &&
    semver.gt(latestModVersion, activatedVersion);

  const caretIcon = expandedModId === modId ? faCaretDown : faCaretRight;

  return (
    <>
      <Accordion.Toggle
        eventKey={modId}
        as={ListGroup.Item}
        className={cx(styles.root, "list-group-item-action", {
          [styles.modBackground ?? ""]: hasModBackground,
        })}
        tabIndex={0} // Avoid using `button` because this item includes more buttons #2343
        active={isActive}
        key={`mod-${modId}`}
        onClick={() => modId != null && dispatch(actions.setActiveModId(modId))}
      >
        <span className={styles.icon}>
          <FontAwesomeIcon icon={faFile} /> <FontAwesomeIcon icon={caretIcon} />
        </span>
        <span className={styles.name}>{name}</span>
        {hasUpdate && (
          <span className={cx(styles.icon, "text-warning")}>
            <ModHasUpdateIcon
              title={`You are editing version ${activatedVersion} of this mod, the latest version is ${latestModVersion}.`}
            />
          </span>
        )}
        <ModActionMenu
          modId={modId}
          isActive={isActive}
          labelRoot={name}
          onSave={onSave}
          onClearChanges={isUnsavedMod ? undefined : onClearChanges}
          onAddStarterBrick={addNewModComponent}
          onMakeCopy={onMakeCopy}
          isDirty={isDirty}
        />
      </Accordion.Toggle>
      <Accordion.Collapse eventKey={modId}>
        <>{children}</>
      </Accordion.Collapse>
    </>
  );
};

export default ModListItem;
