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

import React, { useReducer, useRef } from "react";
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
import useMarketplaceActivateRecipe from "@/sidebar/activateRecipe/useMarketplaceActivateRecipe";
import { type WizardValues } from "@/activation/wizardTypes";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import useWizard from "@/activation/useWizard";
import RequireRecipe, {
  type RecipeState,
} from "@/sidebar/activateRecipe/RequireRecipe";
import { useAsyncEffect } from "use-async-effect";
import { persistor } from "@/sidebar/store";

const { actions } = sidebarSlice;

const ShortcutKeys: React.FC<{ shortcut: string | null }> = ({ shortcut }) => {
  const shortcutKeys = shortcut?.split("") ?? [];
  return (
    <div className={styles.shortcutContainer}>
      {shortcutKeys.map((key, index) => (
        <React.Fragment key={key}>
          {index > 0 && <span>&nbsp;&nbsp;+&nbsp;&nbsp;</span>}
          <span className={styles.shortcutKey}>{key}</span>
        </React.Fragment>
      ))}
    </div>
  );
};

type ActivationState = {
  isInitialized: boolean;
  needsPermissions: boolean;
  isActivating: boolean;
  isActivated: boolean;
  activationError: string | null;
};

const initialState: ActivationState = {
  isInitialized: false,
  needsPermissions: false,
  isActivating: false,
  isActivated: false,
  activationError: null,
};

const activationSlice = createSlice({
  name: "activationSlice",
  initialState,
  reducers: {
    setNeedsPermissions(state, action: PayloadAction<boolean>) {
      state.needsPermissions = action.payload;
      state.isInitialized = true;
    },
    activateStart(state) {
      state.isInitialized = true;
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

const ActivateRecipePanelContent: React.FC<RecipeState> = ({
  recipe,
  recipeNameNode,
  includesQuickBar,
  needsPermissions,
  canAutoActivate,
}) => {
  const reduxDispatch = useDispatch();
  const marketplaceActivateRecipe = useMarketplaceActivateRecipe();
  const { shortcut } = useQuickbarShortcut();

  const [state, stateDispatch] = useReducer(
    activationSlice.reducer,
    initialState
  );

  async function closeSidebar() {
    reduxDispatch(actions.hideActivateRecipe());
    const topFrame = await getTopLevelFrame();
    void hideSidebar(topFrame);
  }

  const [wizardSteps, initialValues, validationSchema] = useWizard(recipe);
  const formValuesRef = useRef<WizardValues>(initialValues);

  async function checkPermissions() {
    stateDispatch(
      setNeedsPermissions(await needsPermissions(formValuesRef.current))
    );
  }

  // Check permissions on mount
  useAsyncEffect(async () => {
    void checkPermissions();
  }, []);

  const onChange = (values: WizardValues) => {
    formValuesRef.current = values;
    void checkPermissions();
  };

  async function activateRecipe() {
    if (state.isActivating || state.isActivated) {
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
  }

  useAsyncEffect(async () => {
    if (state.isInitialized && !state.needsPermissions && canAutoActivate) {
      await activateRecipe();
    }
  }, [canAutoActivate, state.isInitialized, state.needsPermissions]);

  if (!state.isInitialized || state.isActivating) {
    return <Loader />;
  }

  return (
    <div className={styles.root}>
      {state.isActivated ? (
        <>
          <div className={cx("scrollable-area", styles.content)}>
            <h1>Well done!</h1>
            <img src={activationCompleteImage} alt="" width={300} />
            <div className={styles.textContainer}>
              {recipeNameNode}
              <div>is ready to use!</div>
              <br />
              {includesQuickBar ? (
                isEmpty(shortcut) ? (
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
                ) : (
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
                )
              ) : (
                <div>Go try it out now, or activate another mod.</div>
              )}
            </div>
          </div>
          <div className={styles.footer}>
            <AsyncButton onClick={closeSidebar}>Ok</AsyncButton>
          </div>
        </>
      ) : (
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
      )}
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
