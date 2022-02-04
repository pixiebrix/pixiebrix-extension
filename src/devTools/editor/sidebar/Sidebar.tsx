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

import browser from "webextension-polyfill";
import React, { FormEvent, useContext, useMemo, useState } from "react";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import { DevToolsContext } from "@/devTools/context";
import { isEmpty, sortBy } from "lodash";
import { sleep } from "@/utils";
import {
  Badge,
  Button,
  Dropdown,
  DropdownButton,
  Form,
  ListGroup,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IExtension, RegistryId, UUID } from "@/core";
import { ADAPTERS } from "@/devTools/editor/extensionPoints/adapter";
import hash from "object-hash";
import logoUrl from "@/icons/custom-icons/favicon.svg";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import useInstallState from "@/devTools/editor/hooks/useInstallState";
import InstalledEntry from "@/devTools/editor/sidebar/InstalledEntry";
import DynamicEntry from "@/devTools/editor/sidebar/DynamicEntry";
import { isExtension } from "@/devTools/editor/sidebar/common";
import useAddElement from "@/devTools/editor/hooks/useAddElement";
import Footer from "@/devTools/editor/sidebar/Footer";
import styles from "./Sidebar.module.scss";
import {
  faAngleDoubleLeft,
  faAngleDoubleRight,
  faSync,
} from "@fortawesome/free-solid-svg-icons";
import { CSSTransition } from "react-transition-group";
import cx from "classnames";
import { CSSTransitionProps } from "react-transition-group/CSSTransition";
import AuthContext from "@/auth/AuthContext";
import { RecipeDefinition } from "@/types/definitions";
import { GridLoader } from "react-spinners";
import RecipeEntry from "@/devTools/editor/sidebar/RecipeEntry";

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

export function getIdForElement(element: IExtension | FormState): string {
  return isExtension(element) ? element.id : element.uuid;
}

type SidebarProps = {
  isInsertingElement: boolean;
  activeElementId: UUID | null;
  activeRecipeId: RegistryId | null;
  readonly elements: FormState[];
  installed: IExtension[];
  recipes: RecipeDefinition[];
  isLoadingItems: boolean;
};

const SidebarExpanded: React.VoidFunctionComponent<
  SidebarProps & {
    collapseSidebar: () => void;
  }
> = ({
  isInsertingElement,
  activeElementId,
  activeRecipeId,
  installed,
  elements,
  recipes,
  isLoadingItems,
  collapseSidebar,
}) => {
  const context = useContext(DevToolsContext);

  const { flags } = useContext(AuthContext);
  const showDeveloperUI =
    process.env.ENVIRONMENT === "development" ||
    flags.includes("page-editor-developer");
  const showBetaExtensionPoints = flags.includes("page-editor-beta");

  const {
    tabState: { hasPermissions },
  } = context;

  const [showAll, setShowAll] = useState(false);

  const {
    availableInstalledIds,
    availableDynamicIds,
    unavailableCount,
  } = useInstallState(installed, elements);

  const elementHash = hash(
    sortBy(elements.map((formState) => `${formState.uuid}-${formState.label}`))
  );
  const recipeHash = hash(
    recipes
      ? recipes.map((recipe) => `${recipe.metadata.id}-${recipe.metadata.name}`)
      : ""
  );
  const { elementsByRecipeId, orphanedElements } = useMemo(
    () => {
      const elementIds = new Set(elements.map((formState) => formState.uuid));
      const elementsByRecipeId: Map<
        RegistryId,
        Array<IExtension | FormState>
      > = new Map();
      const orphanedElements: Array<IExtension | FormState> = [];
      const filteredExtensions: IExtension[] = installed.filter(
        (extension) =>
          !elementIds.has(extension.id) &&
          (showAll || availableInstalledIds?.has(extension.id))
      );
      const filteredDynamicElements: FormState[] = elements.filter(
        (formState) =>
          showAll ||
          availableDynamicIds?.has(formState.uuid) ||
          activeElementId === formState.uuid
      );

      for (const extension of filteredExtensions) {
        if (extension._recipe) {
          const recipeId = extension._recipe.id;
          if (elementsByRecipeId.has(recipeId)) {
            elementsByRecipeId.get(recipeId).push(extension);
          } else {
            elementsByRecipeId.set(recipeId, [extension]);
          }
        } else {
          orphanedElements.push(extension);
        }
      }

      for (const element of filteredDynamicElements) {
        if (element.recipe) {
          const recipeId = element.recipe.id;
          if (elementsByRecipeId.has(recipeId)) {
            elementsByRecipeId.get(recipeId).push(element);
          } else {
            elementsByRecipeId.set(recipeId, [element]);
          }
        } else {
          orphanedElements.push(element);
        }
      }

      return {
        elementsByRecipeId,
        orphanedElements: sortBy(orphanedElements, (element) => element.label),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- using elementHash to track element changes
    [
      installed,
      elementHash,
      recipeHash,
      availableDynamicIds,
      showAll,
      availableInstalledIds,
      activeElementId,
    ]
  );

  const addElement = useAddElement();

  const ElementListItem: React.FC<{
    element: IExtension | FormState;
    isNested?: boolean;
  }> = ({ element, isNested = false }) =>
    isExtension(element) ? (
      <InstalledEntry
        key={`installed-${element.id}`}
        extension={element}
        recipes={recipes}
        active={activeElementId === element.id}
        available={
          !availableInstalledIds || availableInstalledIds.has(element.id)
        }
        isNested={isNested}
      />
    ) : (
      <DynamicEntry
        key={`dynamic-${element.uuid}`}
        item={element}
        active={activeElementId === element.uuid}
        available={
          !availableDynamicIds || availableDynamicIds.has(element.uuid)
        }
        isNested={isNested}
      />
    );

  return (
    <div className={cx(styles.root, styles.expanded)}>
      <div>
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
              disabled={isInsertingElement || !hasPermissions}
              variant="info"
              size="sm"
              title="Add"
              id="add-extension-point"
            >
              {sortBy([...ADAPTERS.values()], (x) => x.displayOrder)
                .filter((element) => showBetaExtensionPoints || !element.beta)
                .map((element) => (
                  <DropdownEntry
                    key={element.elementType}
                    caption={element.label}
                    icon={element.icon}
                    beta={element.beta}
                    onClick={() => {
                      addElement(element);
                    }}
                  />
                ))}
            </DropdownButton>

            {showDeveloperUI && (
              <Button
                type="button"
                size="sm"
                variant="light"
                title="Shift-click to attempt to reload all contexts (in 2 seconds)"
                onClick={async (event) => {
                  if (event.shiftKey) {
                    browser.runtime?.reload(); // Not guaranteed
                    await browser.tabs.reload(
                      browser.devtools.inspectedWindow.tabId
                    );

                    // We must wait before reloading or else the loading fails
                    // https://github.com/pixiebrix/pixiebrix-extension/pull/2381
                    await sleep(2000);
                  }

                  location.reload();
                }}
              >
                <FontAwesomeIcon icon={faSync} />
              </Button>
            )}
          </div>
          <Button
            variant="light"
            className={cx(styles.toggle)}
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
        {isLoadingItems ? (
          <GridLoader />
        ) : (
          <ListGroup>
            {[...elementsByRecipeId.entries()].map(([recipeId, elements]) => (
              <RecipeEntry
                key={recipeId}
                recipeId={recipeId}
                recipes={recipes}
                elements={elements}
                activeRecipeId={activeRecipeId}
              >
                {sortBy(elements, (element) => element.label).map((element) => (
                  <ElementListItem
                    key={getIdForElement(element)}
                    element={element}
                    isNested={true}
                  />
                ))}
              </RecipeEntry>
            ))}
            {!isEmpty(orphanedElements) &&
              orphanedElements.map((element) => (
                <ElementListItem
                  key={getIdForElement(element)}
                  element={element}
                />
              ))}
          </ListGroup>
        )}
      </div>
      <Footer />
    </div>
  );
};

const SidebarCollapsed: React.VoidFunctionComponent<{
  expandSidebar: () => void;
}> = ({ expandSidebar }) => (
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
  </div>
);

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

const Sidebar: React.VoidFunctionComponent<SidebarProps> = (props) => {
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
          {...props}
        />
      </CSSTransition>
    </>
  );
};

export default Sidebar;
