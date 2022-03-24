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
import { actions } from "@/pageEditor/slices/editorSlice";
import { PageEditorTabContext } from "@/pageEditor/context";
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
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import hash from "object-hash";
import logoUrl from "@/icons/custom-icons/favicon.svg";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import useInstallState from "@/pageEditor/hooks/useInstallState";
import InstalledEntry from "@/pageEditor/sidebar/InstalledEntry";
import DynamicEntry from "@/pageEditor/sidebar/DynamicEntry";
import { isExtension } from "@/pageEditor/sidebar/common";
import useAddElement from "@/pageEditor/hooks/useAddElement";
import Footer from "@/pageEditor/sidebar/Footer";
import {
  faAngleDoubleLeft,
  faAngleDoubleRight,
  faFileImport,
  faSync,
} from "@fortawesome/free-solid-svg-icons";
import { CSSTransition } from "react-transition-group";
import cx from "classnames";
import { CSSTransitionProps } from "react-transition-group/CSSTransition";
import { RecipeDefinition } from "@/types/definitions";
import Loader from "@/components/Loader";
import RecipeEntry from "@/pageEditor/sidebar/RecipeEntry";
import useFlags from "@/hooks/useFlags";
import arrangeElements from "@/pageEditor/sidebar/arrangeElements";
import {
  getIdForElement,
  selectIsShowingAddToRecipeModal,
} from "@/pageEditor/slices/editorSelectors";
import { useDispatch, useSelector } from "react-redux";
import { FormState } from "@/pageEditor/pageEditorTypes";

const ReloadButton: React.VoidFunctionComponent = () => (
  <Button
    type="button"
    size="sm"
    variant="light"
    title="Shift-click to attempt to reload all contexts (in 2 seconds)"
    className="mt-auto"
    onClick={async (event) => {
      if (event.shiftKey) {
        browser.runtime?.reload(); // Not guaranteed
        await browser.tabs.reload(browser.devtools.inspectedWindow.tabId);

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

const AddToRecipeButton: React.VFC = () => {
  const dispatch = useDispatch();
  const isShowingAddToRecipeModal = useSelector(
    selectIsShowingAddToRecipeModal
  );

  return (
    <Button
      type="button"
      size="sm"
      variant="light"
      title="Add extension to a blueprint"
      onClick={() => {
        console.log("click button");
        dispatch(actions.showAddToRecipeModal());
      }}
      disabled={isShowingAddToRecipeModal}
    >
      <FontAwesomeIcon icon={faFileImport} />
    </Button>
  );
};

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
  const context = useContext(PageEditorTabContext);

  const { flagOn } = useFlags();
  const showDeveloperUI =
    process.env.ENVIRONMENT === "development" ||
    flagOn("page-editor-developer");
  const groupByRecipe = flagOn("page-editor-blueprints");

  const {
    tabState: { hasPermissions },
  } = context;

  const [showAll, setShowAll] = useState(false);

  const { availableInstalledIds, availableDynamicIds, unavailableCount } =
    useInstallState(installed, elements);

  const activeElement = elements.find(
    (element) => element.uuid === activeElementId
  );

  const showAddToRecipeButton =
    flagOn("page-editor-blueprints") &&
    !isEmpty(recipes) &&
    activeElement &&
    activeElement.recipe == null;

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
        groupByRecipe,
        activeElementId,
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

            {showAddToRecipeButton && <AddToRecipeButton />}
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
        {isLoadingItems ? (
          <Loader />
        ) : (
          <ListGroup>
            {elementsByRecipeId.map(([recipeId, elements]) => (
              <RecipeEntry
                key={recipeId}
                recipeId={recipeId}
                recipes={recipes}
                elements={elements}
                activeRecipeId={activeRecipeId}
              >
                {elements.map((element) => (
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
