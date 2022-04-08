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

import React, { useState } from "react";
import { RegistryId } from "@/core";
import { RecipeDefinition } from "@/types/definitions";
import styles from "./Entry.module.scss";
import { UnsavedChangesIcon } from "@/pageEditor/sidebar/ExtensionIcons";
import { ListGroup } from "react-bootstrap";
import { actions } from "@/pageEditor/slices/editorSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import cx from "classnames";
import {
  selectDirtyMetadataForRecipeId,
  selectRecipeIsDirty,
} from "@/pageEditor/slices/editorSelectors";
import { useGetRecipesQuery } from "@/services/api";

type RecipeEntryProps = {
  recipeId: RegistryId;
  isActive?: boolean;
};

const RecipeEntry: React.FC<RecipeEntryProps> = ({
  recipeId,
  isActive,
  children,
}) => {
  const [expanded, setExpanded] = useState(false);
  const dispatch = useDispatch();
  const { data: recipes } = useGetRecipesQuery();
  const savedName = recipes?.find((recipe) => recipe.metadata.id === recipeId)
    ?.metadata?.name;
  const dirtyName = useSelector(selectDirtyMetadataForRecipeId(recipeId))?.name;
  const name = dirtyName ?? savedName ?? "Loading...";
  const isDirty = useSelector(selectRecipeIsDirty(recipeId));

  const caretIcon = expanded ? faCaretDown : faCaretRight;

  return (
    <>
      <ListGroup.Item
        className={cx(styles.root, "list-group-item-action")}
        tabIndex={0} // Avoid using `button` because this item includes more buttons #2343
        active={isActive}
        key={`recipe-${recipeId}`}
        onClick={() => dispatch(actions.selectRecipeId(recipeId))}
      >
        <button
          className={styles.icon}
          onClick={(event) => {
            setExpanded(!expanded);
            event.stopPropagation();
          }}
        >
          <FontAwesomeIcon icon={caretIcon} />
        </button>
        <span className={styles.name}>{name}</span>
        {isDirty && (
          <span className={cx(styles.icon, "text-danger")}>
            <UnsavedChangesIcon />
          </span>
        )}
      </ListGroup.Item>
      {expanded && children}
    </>
  );
};

export default RecipeEntry;
