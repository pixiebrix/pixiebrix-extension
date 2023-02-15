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

import React, { useEffect, useRef, useState } from "react";
import { type RegistryId } from "@/core";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import Loader from "@/components/Loader";
import { useRecipe } from "@/recipes/recipesHooks";
import activationCompleteImage from "@img/blueprint-activation-complete.png";
import styles from "./ActivateRecipePanel.module.scss";
import AsyncButton from "@/components/AsyncButton";
import { useDispatch, useSelector } from "react-redux";
import sidebarSlice from "@/sidebar/sidebarSlice";
import { hideSidebar } from "@/contentScript/messenger/api";
import { getTopLevelFrame } from "webext-messenger";
import cx from "classnames";
import { isEmpty, uniq } from "lodash";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import ActivateRecipeInputs from "@/sidebar/activateRecipe/ActivateRecipeInputs";
import { selectExtensionsForRecipe } from "@/store/extensionsSelectors";

const { actions } = sidebarSlice;

type ActivateRecipePanelProps = {
  recipeId: RegistryId;
};

const ActivateRecipePanel: React.FC<ActivateRecipePanelProps> = ({
  recipeId,
}) => {
  const dispatch = useDispatch();

  const {
    data: recipe,
    isLoading,
    isUninitialized,
    error: recipeError,
  } = useRecipe(recipeId);

  const isLoadingRecipe = isUninitialized || isLoading;

  const {
    data: listings,
    isLoading: isLoadingListing,
    error: listingError,
  } = useGetMarketplaceListingsQuery({ package__name: recipeId });
  // eslint-disable-next-line security/detect-object-injection -- RegistryId
  const listing = listings?.[recipeId];

  if (recipeError || listingError) {
    throw recipeError ?? listingError;
  }

  let isReinstall = false;
  const recipeExtensions = useSelector(selectExtensionsForRecipe(recipeId));
  if (!isEmpty(recipeExtensions)) {
    isReinstall = true;
  }

  const recipeName =
    listing?.package?.verbose_name ??
    listing?.package?.name ??
    "Unnamed blueprint";
  const recipeNameComponent = (
    <div className={styles.recipeName}>{recipeName}</div>
  );

  const hasRecipeOptions = !isEmpty(recipe?.options?.schema?.properties);
  const recipeServiceIds = uniq(
    recipe?.extensionPoints.flatMap(({ services }) =>
      services ? Object.values(services) : []
    ) ?? []
  );
  const needsServiceInputs = recipeServiceIds.some(
    (serviceId) => serviceId !== PIXIEBRIX_SERVICE_ID
  );

  const submitRef = useRef<HTMLButtonElement>(null);
  const activateRecipe = () => {
    submitRef.current?.click();
  };

  const [recipeActivated, setRecipeActivated] = useState(false);

  useEffect(() => {
    if (
      !recipeActivated &&
      !isLoadingRecipe &&
      !recipeError &&
      // If the recipe doesn't have options or services, we can activate immediately
      !hasRecipeOptions &&
      !needsServiceInputs
    ) {
      activateRecipe();
    }
  }, [
    hasRecipeOptions,
    isLoadingRecipe,
    needsServiceInputs,
    recipeActivated,
    recipeError,
  ]);

  if (isLoadingRecipe || isLoadingListing) {
    return <Loader />;
  }

  if (recipe == null) {
    throw new Error(`Recipe ${recipeId} not found`);
  }

  async function closeSidebar() {
    dispatch(actions.hideActivateRecipe());
    const topFrame = await getTopLevelFrame();
    void hideSidebar(topFrame);
  }

  return (
    <div className={styles.root}>
      {recipeActivated ? (
        <>
          <div className={cx("scrollable-area", styles.content)}>
            <h1>Well done!</h1>
            <img src={activationCompleteImage} alt="" width={300} />
            <div className={styles.textContainer}>
              {recipeNameComponent}
              <div>is ready to use!</div>
              <br />
              <div>Go try it out now, or activate another blueprint.</div>
            </div>
          </div>
          <div className={styles.footer}>
            <AsyncButton onClick={closeSidebar}>Ok</AsyncButton>
          </div>
        </>
      ) : (
        <ActivateRecipeInputs
          recipe={recipe}
          isReinstall={isReinstall}
          onClickCancel={closeSidebar}
          header={
            <>
              {recipeNameComponent}
              <p>
                {
                  "We're almost there. This blueprint has a few settings to configure before using. You can always change these later."
                }
              </p>
            </>
          }
          submitButtonRef={submitRef}
          onSubmitSuccess={() => {
            setRecipeActivated(true);
          }}
        />
      )}
    </div>
  );
};

export default ActivateRecipePanel;
