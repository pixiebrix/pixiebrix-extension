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

import styles from "./Sidebar.module.scss";
import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { sortBy } from "lodash";
import { getRecipeById } from "@/utils";
import { Accordion, Button, Form, ListGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import hash from "object-hash";
import { isExtension } from "@/pageEditor/sidebar/common";
import { faAngleDoubleLeft } from "@fortawesome/free-solid-svg-icons";
import cx from "classnames";
import RecipeEntry from "@/pageEditor/sidebar/RecipeEntry";
import useFlags from "@/hooks/useFlags";
import arrangeElements from "@/pageEditor/sidebar/arrangeElements";
import {
  selectActiveElementId,
  selectActiveRecipeId,
  selectExpandedRecipeId,
  selectExtensionAvailability,
  selectNotDeletedElements,
  selectNotDeletedExtensions,
} from "@/pageEditor/slices/editorSelectors";
import { useDispatch, useSelector } from "react-redux";
import { useGetRecipesQuery } from "@/services/api";
import { getIdForElement, getRecipeIdForElement } from "@/pageEditor/utils";
import useSaveRecipe from "@/pageEditor/hooks/useSaveRecipe";
import useResetRecipe from "@/pageEditor/hooks/useResetRecipe";
import useRemoveRecipe from "@/pageEditor/hooks/useRemoveRecipe";
import Logo from "./Logo";
import ReloadButton from "./ReloadButton";
import AddExtensionPointButton from "./AddExtensionPointButton";
import ExtensionEntry from "./ExtensionEntry";
import { actions } from "@/pageEditor/slices/editorSlice";
import { measureDurationFromAppStart } from "@/utils/performance";

const SidebarExpanded: React.FunctionComponent<{
  collapseSidebar: () => void;
}> = ({ collapseSidebar }) => {
  const { data: allRecipes, isLoading: isAllRecipesLoading } =
    useGetRecipesQuery();

  useEffect(() => {
    if (!isAllRecipesLoading) {
      measureDurationFromAppStart("sidebarExpanded:allRecipesLoaded");
    }
  }, [isAllRecipesLoading]);

  const dispatch = useDispatch();
  const activeElementId = useSelector(selectActiveElementId);
  const activeRecipeId = useSelector(selectActiveRecipeId);
  const expandedRecipeId = useSelector(selectExpandedRecipeId);
  const installed = useSelector(selectNotDeletedExtensions);
  const elements = useSelector(selectNotDeletedElements);
  const {
    availableInstalledIds,
    unavailableInstalledCount,
    availableDynamicIds,
    unavailableDynamicCount,
  } = useSelector(selectExtensionAvailability);
  const unavailableCount = unavailableInstalledCount + unavailableDynamicCount;

  const recipes = useMemo(() => {
    const installedAndElements = [...installed, ...elements];
    return (
      allRecipes?.filter((recipe) =>
        installedAndElements.some(
          (element) => getRecipeIdForElement(element) === recipe.metadata.id
        )
      ) ?? []
    );
  }, [allRecipes, elements, installed]);

  const { flagOn } = useFlags();
  const showDeveloperUI =
    process.env.ENVIRONMENT === "development" ||
    flagOn("page-editor-developer");

  const [showAll, setShowAll] = useState(false);

  const elementHash = hash(
    sortBy(
      elements.map(
        (formState) =>
          `${formState.uuid}-${formState.label}-${formState.recipe?.id ?? ""}`
      )
    )
  );
  const recipeHash = hash(
    recipes
      ? recipes.map((recipe) => `${recipe.metadata.id}-${recipe.metadata.name}`)
      : ""
  );
  const sortedElements = useMemo(
    () =>
      arrangeElements({
        elements,
        installed,
        recipes,
        availableInstalledIds,
        availableDynamicIds,
        showAll,
        activeElementId,
        expandedRecipeId,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- using elementHash and recipeHash to track changes
    [
      installed,
      elementHash,
      recipeHash,
      availableDynamicIds,
      showAll,
      availableInstalledIds,
      activeElementId,
      expandedRecipeId,
    ]
  );

  const { save: saveRecipe, isSaving: isSavingRecipe } = useSaveRecipe();
  const resetRecipe = useResetRecipe();
  const removeRecipe = useRemoveRecipe();

  const listItems = sortedElements.map((item) => {
    if (Array.isArray(item)) {
      const [recipeId, elements] = item;
      const recipe = getRecipeById(recipes, recipeId);
      const firstElement = elements[0];
      const installedVersion =
        firstElement == null
          ? // If there's no extensions in the Blueprint (empty Blueprint?), use the Blueprint's version
            recipe?.metadata?.version
          : isExtension(firstElement)
          ? firstElement._recipe.version
          : firstElement.recipe.version;

      return (
        <RecipeEntry
          key={recipeId}
          recipe={recipe}
          isActive={recipeId === activeRecipeId}
          installedVersion={installedVersion}
          onSave={async () => {
            await saveRecipe(activeRecipeId);
          }}
          isSaving={isSavingRecipe}
          onReset={async () => {
            await resetRecipe(activeRecipeId);
          }}
          onRemove={async () => {
            await removeRecipe({ recipeId: activeRecipeId });
          }}
          onClone={async () => {
            dispatch(actions.showCreateRecipeModal({ keepLocalCopy: true }));
          }}
        >
          {elements.map((element) => (
            <ExtensionEntry
              key={getIdForElement(element)}
              extension={element}
              recipes={recipes}
              availableInstalledIds={availableInstalledIds}
              availableDynamicIds={availableDynamicIds}
              isNested
            />
          ))}
        </RecipeEntry>
      );
    }

    return (
      <ExtensionEntry
        key={getIdForElement(item)}
        recipes={recipes}
        availableInstalledIds={availableInstalledIds}
        availableDynamicIds={availableDynamicIds}
        extension={item}
      />
    );
  });

  return (
    <div className={cx(styles.root, styles.expanded)}>
      <div className={styles.header}>
        <div className={styles.actions}>
          <div className={styles.actionsLeft}>
            <a
              href="/options.html"
              target="_blank"
              title="Open PixieBrix Options"
            >
              <Logo />
            </a>

            <AddExtensionPointButton />

            {showDeveloperUI && <ReloadButton />}
          </div>
          <Button
            variant="light"
            className={styles.toggle}
            type="button"
            onClick={collapseSidebar}
          >
            <FontAwesomeIcon icon={faAngleDoubleLeft} />
          </Button>
        </div>

        {unavailableCount ? (
          <div className={styles.unavailable}>
            <Form.Check
              id="unavailable-extensions-checkbox"
              type="checkbox"
              label={`Show ${unavailableCount} unavailable`}
              defaultChecked={showAll}
              onChange={(event: FormEvent<HTMLInputElement>) => {
                setShowAll(event.currentTarget.checked);
              }}
            />
          </div>
        ) : null}
      </div>
      <div className={styles.extensions}>
        <Accordion activeKey={expandedRecipeId}>
          <ListGroup>{listItems}</ListGroup>
        </Accordion>
      </div>
    </div>
  );
};

export default SidebarExpanded;
