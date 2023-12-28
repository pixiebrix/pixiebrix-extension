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

import React, { type PropsWithChildren } from "react";
import { type Metadata } from "@/types/registryTypes";
import styles from "./Entry.module.scss";
import {
  RecipeHasUpdateIcon,
  UnsavedChangesIcon,
} from "@/pageEditor/sidebar/ExtensionIcons";
import { Accordion, ListGroup } from "react-bootstrap";
import { actions } from "@/pageEditor/slices/editorSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCaretDown,
  faCaretRight,
  faFile,
} from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import cx from "classnames";
import {
  selectActiveElement,
  selectActiveRecipeId,
  selectDirtyMetadataForRecipeId,
  selectExpandedRecipeId,
  selectRecipeIsDirty,
} from "@/pageEditor/slices/editorSelectors";
import * as semver from "semver";
import ActionMenu from "@/pageEditor/sidebar/ActionMenu";
import { useGetRecipeQuery } from "@/services/api";

export type ModListItemProps = PropsWithChildren<{
  modMetadata: Metadata;
  onSave: () => Promise<void>;
  isSaving: boolean;
  onReset: () => Promise<void>;
  onDeactivate: () => Promise<void>;
  onClone: () => Promise<void>;
}>;

const ModListItem: React.FC<ModListItemProps> = ({
  modMetadata,
  children,
  onSave,
  isSaving,
  onReset,
  onDeactivate,
  onClone,
}) => {
  const dispatch = useDispatch();
  const activeModId = useSelector(selectActiveRecipeId);
  const expandedModId = useSelector(selectExpandedRecipeId);
  const activeElement = useSelector(selectActiveElement);
  const { id: modId, name: savedName, version: installedVersion } = modMetadata;
  const isActive = activeModId === modId;

  // TODO: Fix this so it pulls from registry, after registry single-item-api-fetch is implemented
  //        (See: https://github.com/pixiebrix/pixiebrix-extension/issues/7184)
  const { data: modDefinition } = useGetRecipeQuery({ recipeId: modId });
  const latestRecipeVersion = modDefinition?.metadata?.version;

  // Set the alternate background if an extension in this recipe is active
  const hasRecipeBackground = activeElement?.recipe?.id === modId;

  const dirtyName = useSelector(selectDirtyMetadataForRecipeId(modId))?.name;
  const name = dirtyName ?? savedName ?? "Loading...";
  const isDirty = useSelector(selectRecipeIsDirty(modId));

  const hasUpdate =
    latestRecipeVersion != null &&
    installedVersion != null &&
    semver.gt(latestRecipeVersion, installedVersion);

  const caretIcon = expandedModId === modId ? faCaretDown : faCaretRight;

  return (
    <>
      <Accordion.Toggle
        eventKey={modId}
        as={ListGroup.Item}
        className={cx(styles.root, "list-group-item-action", {
          [styles.recipeBackground ?? ""]: hasRecipeBackground,
        })}
        tabIndex={0} // Avoid using `button` because this item includes more buttons #2343
        active={isActive}
        key={`recipe-${modId}`}
        onClick={() => modId != null && dispatch(actions.selectRecipeId(modId))}
      >
        <span className={styles.icon}>
          <FontAwesomeIcon icon={faFile} /> <FontAwesomeIcon icon={caretIcon} />
        </span>
        <span className={styles.name}>{name}</span>
        {isDirty && !isActive && (
          <span className={cx(styles.icon, "text-danger")}>
            <UnsavedChangesIcon />
          </span>
        )}
        {hasUpdate && (
          <span className={cx(styles.icon, "text-warning")}>
            <RecipeHasUpdateIcon
              title={`You are editing version ${installedVersion} of this mod, the latest version is ${latestRecipeVersion}.`}
            />
          </span>
        )}
        {isActive && (
          <ActionMenu
            onSave={onSave}
            onReset={onReset}
            onDeactivate={onDeactivate}
            onClone={onClone}
            isDirty={isDirty}
            disabled={isSaving}
          />
        )}
      </Accordion.Toggle>
      <Accordion.Collapse eventKey={modId}>
        <>{children}</>
      </Accordion.Collapse>
    </>
  );
};

export default ModListItem;
