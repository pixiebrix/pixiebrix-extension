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

import React, {
  type Dispatch,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { type RegistryId } from "@/types/registryTypes";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import Loader from "@/components/Loader";
import { useRecipe } from "@/recipes/recipesHooks";
import activationCompleteImage from "@img/blueprint-activation-complete.png";
import styles from "./ActivateRecipePanel.module.scss";
import AsyncButton from "@/components/AsyncButton";
import { useDispatch } from "react-redux";
import sidebarSlice from "@/sidebar/sidebarSlice";
import { hideSidebar } from "@/contentScript/messenger/api";
import { getTopLevelFrame } from "webext-messenger";
import cx from "classnames";
import { isEmpty, uniq } from "lodash";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import ActivateRecipeInputs from "@/sidebar/activateRecipe/ActivateRecipeInputs";
import { useAsyncState } from "@/hooks/common";
import { resolveRecipe } from "@/registry/internal";
import { useAsyncEffect } from "use-async-effect";
import includesQuickBarExtensionPoint from "@/utils/includesQuickBarExtensionPoint";
import useQuickbarShortcut from "@/hooks/useQuickbarShortcut";
import { openShortcutsTab, SHORTCUTS_URL } from "@/chrome";
import { Button } from "react-bootstrap";
import useMarketplaceActivateRecipe, {
  type ActivateResult,
} from "@/sidebar/activateRecipe/useMarketplaceActivateRecipe";
import { type WizardValues } from "@/activation/wizardTypes";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { type AnyAction } from "redux";
import useWizard from "@/activation/useWizard";

const { actions } = sidebarSlice;

type ActivateRecipePanelProps = {
  recipeId: RegistryId;
};

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

type RecipeState = {
  isLoading: boolean;
  recipe: RecipeDefinition | null;
  recipeNameNode: React.ReactNode | null;
  includesQuickbar: boolean;
};

function useRecipeState(recipeId: RegistryId): RecipeState {
  // Recipe
  const {
    data: recipe,
    isLoading: isLoadingRecipe,
    isUninitialized,
    error: recipeError,
  } = useRecipe(recipeId);

  // Listing
  const {
    data: listings,
    isLoading: isLoadingListing,
    error: listingError,
  } = useGetMarketplaceListingsQuery({ package__name: recipeId });
  // eslint-disable-next-line security/detect-object-injection -- RegistryId
  const listing = useMemo(() => listings?.[recipeId], [listings, recipeId]);

  // Name component
  const recipeName =
    listing?.package?.verbose_name ?? listing?.package?.name ?? "Unnamed mod";

  // Quick Bar
  const [includesQuickbar, isLoadingQuickbar] = useAsyncState(async () => {
    const resolvedRecipeConfigs = await resolveRecipe(
      recipe,
      recipe.extensionPoints
    );
    return includesQuickBarExtensionPoint(resolvedRecipeConfigs);
  }, [recipe]);

  // Throw errors
  if (recipeError) {
    throw recipeError;
  }

  if (listingError) {
    throw listingError;
  }

  // Ensure recipe is loaded
  if (!isUninitialized && !isLoadingRecipe && !recipeError && !recipe) {
    throw new Error(`Recipe ${recipeId} not found`);
  }

  // Loading state
  const isLoading =
    isUninitialized || isLoadingRecipe || isLoadingListing || isLoadingQuickbar;

  return useMemo<RecipeState>(
    () => ({
      isLoading,
      recipe,
      recipeNameNode: <div className={styles.recipeName}>{recipeName}</div>,
      includesQuickbar,
    }),
    [includesQuickbar, isLoading, recipe, recipeName]
  );
}

type ActivationState = {
  isInitialized: boolean;
  activateRecipe: () => Promise<ActivateResult>;
  canAutoActivate: boolean;
  isActivating: boolean;
  isActivated: boolean;
  activationError: string | null;
};

const initialState: ActivationState = {
  isInitialized: false,
  async activateRecipe() {
    throw new Error("Activation state not initialized");
  },
  canAutoActivate: false,
  isActivating: false,
  isActivated: false,
  activationError: null,
};

type Initialize = {
  canAutoActivate: boolean;
  activateRecipe: () => Promise<ActivateResult>;
};

const activationSlice = createSlice({
  name: "activationSlice",
  initialState,
  reducers: {
    initialize(state, action: PayloadAction<Initialize>) {
      const { canAutoActivate, activateRecipe } = action.payload;
      state.isInitialized = true;
      state.canAutoActivate = canAutoActivate;
      state.activateRecipe = activateRecipe;
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

const { initialize, activateStart, activateSuccess, activateError } =
  activationSlice.actions;

async function dispatchActivateRecipe(
  state: ActivationState,
  dispatch: Dispatch<AnyAction>
) {
  if (!state.isInitialized || state.isActivating || state.isActivated) {
    return;
  }

  dispatch(activateStart());

  const { success, error } = await state.activateRecipe();

  if (success) {
    dispatch(activateSuccess());
  } else {
    dispatch(activateError(error));
  }
}

type ActivationViewState = {
  activate: () => Promise<void>;
  isLoading: boolean;
  isActivated: boolean;
  activationError: string | null;
};

function useActivationViewState(
  recipe: RecipeDefinition,
  activateRecipe: (recipe: RecipeDefinition) => Promise<ActivateResult>
): ActivationViewState {
  const [state, dispatch] = useReducer(activationSlice.reducer, initialState);

  // Set recipe loaded
  useEffect(() => {
    if (!recipe || state.isInitialized) {
      return;
    }

    const hasRecipeOptions = !isEmpty(recipe.options?.schema?.properties);
    const recipeServiceIds = uniq(
      recipe.extensionPoints.flatMap(({ services }) =>
        services ? Object.values(services) : []
      )
    );
    const needsServiceInputs = recipeServiceIds.some(
      (serviceId) => serviceId !== PIXIEBRIX_SERVICE_ID
    );

    dispatch(
      initialize({
        // Can auto-activate if no configuration required
        canAutoActivate: !hasRecipeOptions && !needsServiceInputs,
        activateRecipe: async () => activateRecipe(recipe),
      })
    );
  }, [activateRecipe, recipe, state]);

  useAsyncEffect(async () => {
    if (state.isInitialized && state.canAutoActivate) {
      await dispatchActivateRecipe(state, dispatch);
    }
  }, [state.canAutoActivate, state.isInitialized]);

  return useMemo(
    () => ({
      activate: async () => dispatchActivateRecipe(state, dispatch),
      isLoading: !state.isInitialized || state.isActivating,
      isActivated: state.isActivated,
      activationError: state.activationError,
    }),
    [state]
  );
}

const ActivateRecipePanel: React.FC<ActivateRecipePanelProps> = ({
  recipeId,
}) => {
  const dispatch = useDispatch();
  const marketplaceActivateRecipe = useMarketplaceActivateRecipe();
  const { shortcut } = useQuickbarShortcut();

  async function closeSidebar() {
    dispatch(actions.hideActivateRecipe());
    const topFrame = await getTopLevelFrame();
    void hideSidebar(topFrame);
  }

  const {
    isLoading: isLoadingRecipe,
    recipe,
    recipeNameNode,
    includesQuickbar,
  } = useRecipeState(recipeId);

  const [wizardSteps, initialValues, validationSchema] = useWizard(recipe);
  const activateFormValues = useRef<WizardValues>(initialValues);
  const activateRecipe = useCallback(
    async (recipe: RecipeDefinition) =>
      marketplaceActivateRecipe(activateFormValues.current, recipe),
    [marketplaceActivateRecipe]
  );

  const {
    activate,
    isLoading: isLoadingActivation,
    isActivated,
    activationError,
  } = useActivationViewState(recipe, activateRecipe);

  if (isLoadingRecipe || isLoadingActivation) {
    return <Loader />;
  }

  return (
    <div className={styles.root}>
      {isActivated ? (
        <>
          <div className={cx("scrollable-area", styles.content)}>
            <h1>Well done!</h1>
            <img src={activationCompleteImage} alt="" width={300} />
            <div className={styles.textContainer}>
              {recipeNameNode}
              <div>is ready to use!</div>
              <br />
              {includesQuickbar ? (
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
          validationSchema={validationSchema}
          onClickCancel={closeSidebar}
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
          formValuesRef={activateFormValues}
          onClickSubmit={() => {
            void activate();
          }}
          activationError={activationError}
        />
      )}
    </div>
  );
};

export default ActivateRecipePanel;
