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

import React from "react";
import { SemVerString } from "@/core";
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
  selectDirtyMetadataForRecipeId,
  selectExpandedRecipeId,
  selectRecipeIsDirty,
} from "@/pageEditor/slices/editorSelectors";
import { RecipeDefinition } from "@/types/definitions";

type RecipeEntryProps = {
  recipe: RecipeDefinition;
  isActive?: boolean;
  installedVersion: SemVerString;
};

const RecipeEntry: React.FC<RecipeEntryProps> = ({
  recipe,
  isActive,
  children,
  installedVersion,
}) => {
  const dispatch = useDispatch();

  const expandedRecipeId = useSelector(selectExpandedRecipeId);
  const activeElement = useSelector(selectActiveElement);
  const {
    id: recipeId,
    name: savedName,
    version: latestRecipeVersion,
  } = recipe.metadata ?? {};

  // Set the alternate background if an extension in this recipe is active
  const hasRecipeBackground = activeElement?.recipe?.id === recipeId;

  const dirtyName = useSelector(selectDirtyMetadataForRecipeId(recipeId))?.name;
  const name = dirtyName ?? savedName ?? "Loading...";
  const isDirty = useSelector(selectRecipeIsDirty(recipeId));

  const hasUpdate = latestRecipeVersion !== installedVersion;

  const caretIcon = expandedRecipeId === recipeId ? faCaretDown : faCaretRight;

  return (
    <>
      <Accordion.Toggle
        eventKey={recipeId}
        as={ListGroup.Item}
        className={cx(styles.root, "list-group-item-action", {
          [styles.recipeBackground]: hasRecipeBackground,
        })}
        tabIndex={0} // Avoid using `button` because this item includes more buttons #2343
        active={isActive}
        key={`recipe-${recipeId}`}
        onClick={() => dispatch(actions.selectRecipeId(recipeId))}
      >
        <span className={styles.icon}>
          <FontAwesomeIcon icon={faFile} /> <FontAwesomeIcon icon={caretIcon} />
        </span>
        <span className={styles.name}>{name}</span>
        {isDirty && (
          <span className={cx(styles.icon, "text-danger")}>
            <UnsavedChangesIcon />
          </span>
        )}
        {hasUpdate && (
          <span className={cx(styles.icon, "text-warning")}>
            <RecipeHasUpdateIcon
              title={`You are editing version ${installedVersion} of this blueprint, the latest version is ${latestRecipeVersion}.`}
            />
          </span>
        )}
      </Accordion.Toggle>
      <Accordion.Collapse eventKey={recipeId}>
        <>{children}</>
      </Accordion.Collapse>
    </>
  );
};

export default RecipeEntry;
