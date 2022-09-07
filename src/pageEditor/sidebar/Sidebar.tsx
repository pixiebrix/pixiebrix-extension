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

import React, { FormEvent, useContext, useMemo, useState } from "react";
import { PageEditorTabContext } from "@/pageEditor/context";
import { lowerCase, sortBy } from "lodash";
import { sleep, getRecipeById } from "@/utils";
import {
  Accordion,
  Badge,
  Button,
  Dropdown,
  DropdownButton,
  Form,
  ListGroup,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IExtension } from "@/core";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import hash from "object-hash";
import logoUrl from "@/icons/custom-icons/favicon.svg";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import useInstallState from "@/pageEditor/hooks/useInstallState";
import InstalledEntry from "@/pageEditor/sidebar/InstalledEntry";
import DynamicEntry from "@/pageEditor/sidebar/DynamicEntry";
import { isExtension } from "@/pageEditor/sidebar/common";
import useAddElement from "@/pageEditor/hooks/useAddElement";
import {
  faAngleDoubleLeft,
  faAngleDoubleRight,
  faSync,
} from "@fortawesome/free-solid-svg-icons";
import { CSSTransition } from "react-transition-group";
import cx from "classnames";
import { CSSTransitionProps } from "react-transition-group/CSSTransition";
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

const ReloadButton: React.VoidFunctionComponent = () => (
  <Button
    type="button"
    size="sm"
    variant="light"
    title="Shift-click to attempt to reload all contexts (in 2 seconds)"
    className="mt-auto"
    onClick={async (event) => {
      if (event.shiftKey) {
        await browser.tabs.reload(browser.devtools.inspectedWindow.tabId);

        browser.runtime?.reload(); // Not guaranteed

        // We must wait before reloading or else the loading fails
        // https://github.com/pixiebrix/pixiebrix-extension/pull/2381
        await sleep(2000);
      }

      location.reload();
    }}
  >
    <FontAwesomeIcon icon={faSync} />
  </Button>
);

const DropdownEntry: React.VoidFunctionComponent<{
  caption: string;
  icon: IconProp;
  onClick: () => void;
  beta?: boolean;
}> = ({ beta, icon, caption, onClick }) => (
  <Dropdown.Item onClick={onClick}>
    <FontAwesomeIcon icon={icon} />
    &nbsp;{caption}
    {beta && (
      <>
        {" "}
        <Badge variant="success" pill>
          Beta
        </Badge>
      </>
    )}
  </Dropdown.Item>
);

const Logo: React.VoidFunctionComponent = () => (
  <img src={logoUrl} alt="PixiBrix logo" className={styles.logo} />
);

const SidebarExpanded: React.VoidFunctionComponent<{
  collapseSidebar: () => void;
}> = ({ collapseSidebar }) => {
  const context = useContext(PageEditorTabContext);

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

  const {
    tabState: { hasPermissions },
  } = context;

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

  const addElement = useAddElement();

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
        onSave={async () => {
          if (element.recipe) {
            await saveRecipe(element.recipe?.id);
          } else {
            await saveExtension(element);
          }
        }}
        isSaving={element.recipe ? isSavingRecipe : isSavingExtension}
        onReset={async () => {
          await resetExtension({ extensionId: element.uuid });
        }}
        onRemove={async () => {
          await removeExtension({ extensionId: element.uuid });
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
            <DropdownButton
              disabled={!hasPermissions}
              variant="info"
              size="sm"
              title="Add"
              id="add-extension-point"
            >
              {sortBy([...ADAPTERS.values()], (x) => x.displayOrder)
                .filter((element) => !element.flag || flagOn(element.flag))
                .map((element) => (
                  <DropdownEntry
                    key={element.elementType}
                    caption={element.label}
                    icon={element.icon}
                    beta={Boolean(element.flag)}
                    onClick={() => {
                      addElement(element);
                    }}
                  />
                ))}
            </DropdownButton>

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

const SidebarCollapsed: React.VoidFunctionComponent<{
  expandSidebar: () => void;
}> = ({ expandSidebar }) => {
  const { flagOn } = useFlags();

  const showDeveloperUI =
    process.env.ENVIRONMENT === "development" ||
    flagOn("page-editor-developer");

  return (
    <>
      <div className={cx(styles.root, styles.collapsed)}>
        <Button
          variant="light"
          className={cx(styles.toggle)}
          type="button"
          onClick={expandSidebar}
        >
          <Logo />
          <FontAwesomeIcon icon={faAngleDoubleRight} />
        </Button>
        {showDeveloperUI && <ReloadButton />}
      </div>
    </>
  );
};

const transitionProps: CSSTransitionProps = {
  classNames: {
    enter: styles.enter,
    enterActive: styles.enterActive,
    exit: styles.exit,
    exitActive: styles.exitActive,
  },
  timeout: 500,
  unmountOnExit: true,
  mountOnEnter: true,
};

const Sidebar: React.VFC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  return (
    <>
      <CSSTransition {...transitionProps} in={collapsed}>
        <SidebarCollapsed
          expandSidebar={() => {
            setCollapsed(false);
          }}
        />
      </CSSTransition>
      <CSSTransition {...transitionProps} in={!collapsed}>
        <SidebarExpanded
          collapseSidebar={() => {
            setCollapsed(true);
          }}
        />
      </CSSTransition>
    </>
  );
};

export default Sidebar;
