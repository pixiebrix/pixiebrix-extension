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

import React, { useCallback, useEffect, useReducer, useRef } from "react";
import { type RegistryId } from "@/types/registryTypes";
import Loader from "@/components/Loader";
import activationCompleteImage from "@img/blueprint-activation-complete.png";
import styles from "./ActivateRecipePanel.module.scss";
import AsyncButton from "@/components/AsyncButton";
import { useDispatch } from "react-redux";
import sidebarSlice from "@/sidebar/sidebarSlice";
import {
  hideSidebar,
  reloadMarketplaceEnhancements as reloadMarketplaceEnhancementsInContentScript,
} from "@/contentScript/messenger/api";
import { getTopLevelFrame } from "webext-messenger";
import cx from "classnames";
import { isEmpty } from "lodash";
import ActivateRecipeInputs from "@/sidebar/activateRecipe/ActivateRecipeInputs";
import useQuickbarShortcut from "@/hooks/useQuickbarShortcut";
import { openShortcutsTab, SHORTCUTS_URL } from "@/chrome";
import { Button } from "react-bootstrap";
import useActivateRecipe from "@/activation/useActivateRecipe";
import { type WizardValues } from "@/activation/wizardTypes";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import useWizard from "@/activation/useWizard";
import RequireRecipe, {
  type RecipeState,
} from "@/sidebar/activateRecipe/RequireRecipe";
import { persistor } from "@/sidebar/store";
import { checkRecipePermissions } from "@/recipes/recipePermissionsHelpers";

const { actions } = sidebarSlice;

type ActivationState = {
  /**
   * True if recipe needs permissions to activate, false if it does not, null if not calculated yet.
   */
  needsPermissions: boolean | null;
  /**
   * True if the recipe is manually or automatically activating.
   */
  isActivating: boolean;
  /**
   * True if the recipe has been activated.
   */
  isActivated: boolean;
  /**
   * The error message if the recipe failed to activate, or null if there is no error
   */
  activationError: string | null;
};

const initialState: ActivationState = {
  isActivating: false,
  isActivated: false,
  // Permissions have not been checked yet
  needsPermissions: null,
  activationError: null,
};

const activationSlice = createSlice({
  name: "activationSlice",
  initialState,
  reducers: {
    setNeedsPermissions(state, action: PayloadAction<boolean>) {
      state.needsPermissions = action.payload;
    },
    activateStart(state) {
      state.isActivating = true;
      state.activationError = null;
    },
    activateSuccess(state) {
      state.isActivating = false;
      state.isActivated = true;
    },
    activateError(state, action: PayloadAction<string>) {
      state.activationError = action.payload;
      state.isActivating = false;
    },
  },
});

const { setNeedsPermissions, activateStart, activateSuccess, activateError } =
  activationSlice.actions;

async function reloadMarketplaceEnhancements() {
  const topFrame = await getTopLevelFrame();
  // Make sure the content script has the most recent state of the store before reloading.
  // Prevents race condition where the content script reloads before the store is persisted.
  await persistor.flush();
  void reloadMarketplaceEnhancementsInContentScript(topFrame);
}

const ShortcutKeys: React.FC<{ shortcut: string | null }> = ({ shortcut }) => {
  const separator = shortcut?.includes("+") ? "+" : "";
  const shortcutKeys = shortcut?.split(separator) ?? [];
  return (
    <div className={styles.shortcutContainer}>
      {shortcutKeys.map((key, index) => (
        <React.Fragment key={key}>
          {index > 0 && <span>&nbsp;&nbsp;+&nbsp;&nbsp;</span>}
          <span className={styles.shortcutKey}>{key.trim()}</span>
        </React.Fragment>
      ))}
    </div>
  );
};

const SuccessMessage: React.FC<{ includesQuickBar: boolean }> = ({
  includesQuickBar,
}) => {
  const { shortcut } = useQuickbarShortcut();

  if (includesQuickBar && isEmpty(shortcut)) {
    return (
      <span>
        Now just{" "}
        <Button
          variant="link"
          href={SHORTCUTS_URL}
          onClick={(event) => {
            // `react-bootstrap` will render as an anchor tag when href is set
            // Can't link to chrome:// URLs directly
            event.preventDefault();
            void openShortcutsTab();
          }}
          className={styles.configureLink}
        >
          Configure your Quick Bar shortcut
        </Button>{" "}
        to access this mod.
      </span>
    );
  }

  if (includesQuickBar) {
    return (
      <>
        <div>Launch it using your Quick Bar shortcut</div>
        <ShortcutKeys shortcut={shortcut} />
        <Button
          variant="link"
          href={SHORTCUTS_URL}
          onClick={(event) => {
            // `react-bootstrap` will render as an anchor tag when href is set
            // Can't link to chrome:// URLs directly
            event.preventDefault();
            void openShortcutsTab();
          }}
        >
          Change the Quick Bar shortcut.
        </Button>
      </>
    );
  }

  return <div>Go try it out now, or activate another mod.</div>;
};

const ActivateRecipePanelContent: React.FC<RecipeState> = ({
  recipe,
  recipeNameNode,
  includesQuickBar,
  requiresConfiguration,
  defaultAuthOptions,
}) => {
  const reduxDispatch = useDispatch();
  const marketplaceActivateRecipe = useActivateRecipe();

  const [state, stateDispatch] = useReducer(
    activationSlice.reducer,
    initialState
  );

  async function closeSidebar() {
    reduxDispatch(actions.hideActivateRecipe());
    const topFrame = await getTopLevelFrame();
    void hideSidebar(topFrame);
  }

  const [wizardSteps, initialValues, validationSchema] = useWizard(
    recipe,
    defaultAuthOptions
  );

  const formValuesRef = useRef<WizardValues>(initialValues);

  async function checkPermissions() {
    const selectedAuths = formValuesRef.current.services.filter(({ config }) =>
      Boolean(config)
    );

    const { hasPermissions } = await checkRecipePermissions(
      recipe,
      selectedAuths
    );

    stateDispatch(setNeedsPermissions(!hasPermissions));
  }

  const onChange = (values: WizardValues) => {
    formValuesRef.current = values;
    void checkPermissions();
  };

  const activateRecipe = useCallback(async () => {
    if (state.isActivating || state.isActivated) {
      // Prevent double-activation
      return;
    }

    stateDispatch(activateStart());

    const { success, error } = await marketplaceActivateRecipe(
      formValuesRef.current,
      recipe
    );

    if (success) {
      stateDispatch(activateSuccess());
      void reloadMarketplaceEnhancements();
    } else {
      stateDispatch(activateError(error));
    }
  }, [
    marketplaceActivateRecipe,
    recipe,
    state.isActivated,
    state.isActivating,
  ]);

  // Check permissions on mount, to determine if the recipe can be auto-activated, and whether to show the
  // permissions request information UI.
  useEffect(() => {
    void checkPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount
  }, []);

  // Trigger auto-activation if the recipe does not require permissions
  useEffect(() => {
    if (
      state.needsPermissions != null &&
      !state.needsPermissions &&
      !requiresConfiguration
    ) {
      // State is checked inside activateRecipe to prevent double-activation
      void activateRecipe();
    }
  }, [
    initialValues,
    activateRecipe,
    requiresConfiguration,
    state.needsPermissions,
  ]);

  // Show loader if panel is determining if it can auto-activate, or if it's activating.
  if (state.needsPermissions == null || state.isActivating) {
    return <Loader />;
  }

  if (state.isActivated) {
    return (
      <div className={styles.root}>
        <div className={cx("scrollable-area", styles.content)}>
          <h1>Well done!</h1>
          <img src={activationCompleteImage} alt="" width={300} />
          <div className={styles.textContainer}>
            {recipeNameNode}
            <div>is ready to use!</div>
            <br />
            <SuccessMessage includesQuickBar={includesQuickBar} />
          </div>
        </div>
        <div className={styles.footer}>
          <AsyncButton onClick={closeSidebar}>Ok</AsyncButton>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <ActivateRecipeInputs
        recipe={recipe}
        wizardSteps={wizardSteps}
        initialValues={initialValues}
        onChange={onChange}
        validationSchema={validationSchema}
        onClickCancel={closeSidebar}
        needsPermissions={state.needsPermissions}
        header={
          <>
            {recipeNameNode}
            <p>
              {
                "We're almost there. This mod has a few settings to configure before using. You can always change these later."
              }
            </p>
          </>
        }
        formValuesRef={formValuesRef}
        onClickSubmit={() => {
          void activateRecipe();
        }}
        activationError={state.activationError}
      />
    </div>
  );
};

const ActivateRecipePanel: React.FC<{ recipeId: RegistryId }> = ({
  recipeId,
}) => (
  <RequireRecipe recipeId={recipeId}>
    {(recipeState) => <ActivateRecipePanelContent {...recipeState} />}
  </RequireRecipe>
);

export default ActivateRecipePanel;
