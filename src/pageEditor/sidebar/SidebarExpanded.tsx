import styles from "./Sidebar.module.scss";
import React, { FormEvent, useMemo, useState } from "react";
import { lowerCase, sortBy } from "lodash";
import { getRecipeById } from "@/utils";
import { Accordion, Button, Form, ListGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IExtension, RegistryId, UUID } from "@/core";
import hash from "object-hash";
import useInstallState from "@/pageEditor/hooks/useInstallState";
import InstalledEntry from "@/pageEditor/sidebar/InstalledEntry";
import DynamicEntry from "@/pageEditor/sidebar/DynamicEntry";
import { isExtension } from "@/pageEditor/sidebar/common";
import { faAngleDoubleLeft } from "@fortawesome/free-solid-svg-icons";
import cx from "classnames";
import Loader from "@/components/Loader";
import RecipeEntry from "@/pageEditor/sidebar/RecipeEntry";
import useFlags from "@/hooks/useFlags";
import arrangeElements from "@/pageEditor/sidebar/arrangeElements";
import {
  selectActiveElementId,
  selectActiveRecipeId,
  selectAllDeletedElementIds,
  selectElements,
  selectExpandedRecipeId,
} from "@/pageEditor/slices/editorSelectors";
import { useSelector } from "react-redux";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { selectExtensions } from "@/store/extensionsSelectors";
import { useGetRecipesQuery } from "@/services/api";
import { getIdForElement, getRecipeIdForElement } from "@/pageEditor/utils";
import useSaveExtension from "@/pageEditor/hooks/useSaveExtension";
import useRemoveExtension from "@/pageEditor/hooks/useRemoveExtension";
import useResetExtension from "@/pageEditor/hooks/useResetExtension";
import useSaveRecipe from "@/pageEditor/hooks/useSaveRecipe";
import useResetRecipe from "@/pageEditor/hooks/useResetRecipe";
import useRemoveRecipe from "@/pageEditor/hooks/useRemoveRecipe";
import Logo from "./Logo";
import ReloadButton from "./ReloadButton";
import AddExtensionPointButton from "./AddExtensionPointButton";

const SidebarExpanded: React.FunctionComponent<{
  collapseSidebar: () => void;
}> = ({ collapseSidebar }) => {
  const { data: allRecipes, isLoading: isLoadingRecipes } =
    useGetRecipesQuery();

  const activeElementId = useSelector(selectActiveElementId);
  const activeRecipeId = useSelector(selectActiveRecipeId);
  const expandedRecipeId = useSelector(selectExpandedRecipeId);
  const deletedElementIds = useSelector(selectAllDeletedElementIds);
  const allInstalled = useSelector(selectExtensions);
  const installed = useMemo(
    () => allInstalled.filter(({ id }) => !deletedElementIds.has(id)),
    [allInstalled, deletedElementIds]
  );
  const allElements = useSelector(selectElements);
  const elements = useMemo(
    () => allElements.filter(({ uuid }) => !deletedElementIds.has(uuid)),
    [allElements, deletedElementIds]
  );

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

  const { availableInstalledIds, availableDynamicIds, unavailableCount } =
    useInstallState(installed, elements);

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
  const { elementsByRecipeId, orphanedElements } = useMemo(
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

  // We need to run these hooks above the list item component level to avoid some nasty re-rendering issues
  const { save: saveExtension, isSaving: isSavingExtension } =
    useSaveExtension();
  const resetExtension = useResetExtension();
  const removeExtension = useRemoveExtension();
  const { save: saveRecipe, isSaving: isSavingRecipe } = useSaveRecipe();
  const resetRecipe = useResetRecipe();
  const removeRecipe = useRemoveRecipe();

  const ElementListItem: React.FC<{
    element: IExtension | FormState;
    isNested?: boolean;
  }> = ({ element, isNested = false }) =>
    isExtension(element) ? (
      <InstalledEntry
        key={`installed-${element.id}`}
        extension={element}
        recipes={recipes}
        isActive={activeElementId === element.id}
        isAvailable={
          !availableInstalledIds || availableInstalledIds.has(element.id)
        }
        isNested={isNested}
      />
    ) : (
      <DynamicEntry
        key={`dynamic-${element.uuid}`}
        item={element}
        isActive={activeElementId === element.uuid}
        isAvailable={
          !availableDynamicIds || availableDynamicIds.has(element.uuid)
        }
        isNested={isNested}
        saveExtension={saveExtension}
        isSavingExtension={isSavingExtension}
        resetExtension={async (extensionId: UUID) => {
          await resetExtension({ extensionId });
        }}
        removeExtension={async (extensionId: UUID) => {
          await removeExtension({ extensionId });
        }}
      />
    );

  const listItems = sortBy(
    [...elementsByRecipeId, ...orphanedElements],
    (item) => {
      if (Array.isArray(item)) {
        const recipeId = item[0];
        const recipe = getRecipeById(recipes, recipeId);
        return lowerCase(recipe?.metadata?.name ?? "");
      }

      return lowerCase(item.label);
    }
  ).map((item) => {
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
          saveRecipe={saveRecipe}
          isSavingRecipe={isSavingRecipe}
          resetRecipe={resetRecipe}
          removeRecipe={async (recipeId: RegistryId) => {
            await removeRecipe({ recipeId });
          }}
        >
          {elements.map((element) => (
            <ElementListItem
              key={getIdForElement(element)}
              element={element}
              isNested
            />
          ))}
        </RecipeEntry>
      );
    }

    const element = item;
    return <ElementListItem key={getIdForElement(element)} element={element} />;
  });

  console.log("Sidebar render");

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
        {isLoadingRecipes ? (
          <Loader />
        ) : (
          <Accordion activeKey={expandedRecipeId}>
            <ListGroup>{listItems}</ListGroup>
          </Accordion>
        )}
      </div>
    </div>
  );
};

export default SidebarExpanded;
