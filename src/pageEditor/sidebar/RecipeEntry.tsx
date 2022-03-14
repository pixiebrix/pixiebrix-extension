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

import React, { useMemo, useState } from "react";
import { IExtension, RegistryId } from "@/core";
import { RecipeDefinition } from "@/types/definitions";
import styles from "./Entry.module.scss";
import { UnsavedChangesIcon } from "@/pageEditor/sidebar/ExtensionIcons";
import { ListGroup } from "react-bootstrap";
import { actions, FormState } from "@/pageEditor/slices/editorSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/pageEditor/store";
import cx from "classnames";
import { selectRecipeIsDirty } from "@/pageEditor/slices/editorSelectors";

type RecipeEntryProps = {
  recipeId: RegistryId;
  recipes: RecipeDefinition[];
  elements: Array<IExtension | FormState>;
  activeRecipeId: RegistryId | null;
};

const RecipeEntry: React.FC<RecipeEntryProps> = ({
  recipeId,
  recipes,
  elements,
  activeRecipeId,
  children,
}) => {
  const [expanded, setExpanded] = useState(false);
  const dispatch = useDispatch();
  const recipe = useMemo<RecipeDefinition>(
    () => recipes.find((recipe) => recipe.metadata.id === recipeId),
    [recipeId, recipes]
  );
  const isDirty = useSelector((state: RootState) =>
    selectRecipeIsDirty(state, recipeId, elements)
  );

  const caretIcon = expanded ? faCaretDown : faCaretRight;

  return (
    <>
      <ListGroup.Item
        className={cx(styles.root, "list-group-item-action")}
        tabIndex={0} // Avoid using `button` because this item includes more buttons #2343
        active={recipeId === activeRecipeId}
        key={`recipe-${recipeId}`}
        onClick={() => dispatch(actions.selectRecipe(recipe))}
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
        <span className={styles.name}>{recipe.metadata.name}</span>
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
