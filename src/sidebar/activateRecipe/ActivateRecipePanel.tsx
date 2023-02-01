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

import React from "react";
import { type RegistryId } from "@/core";
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

const { actions } = sidebarSlice;

const ActivateRecipePanel: React.FC<{ recipeId: RegistryId }> = ({
  recipeId,
}) => {
  const dispatch = useDispatch();

  const {
    data: recipe,
    isLoading: isLoadingRecipe,
    error: recipeError,
  } = useRecipe(recipeId);

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

  if (isLoadingRecipe || isLoadingListing) {
    return <Loader />;
  }

  const recipeOptions = recipe.options?.schema?.properties;

  // if (hasOptions) {
  //   return <ActivateWizard blueprint={recipe} />;
  // }

  const finishButtonCaption = listing.example_page_url
    ? "Try it now"
    : "Start using PixieBrix";
  const onClickFinish = async () => {
    if (listing.example_page_url) {
      window.open(listing.example_page_url, "_blank", "noopener,noreferrer");
    }

    dispatch(actions.hideActivateRecipe());
    const topFrame = await getTopLevelFrame();
    void hideSidebar(topFrame);
  };

  return (
    <div className={styles.root}>
      <div className={cx("scrollable-area", styles.content)}>
        <h1>Well done!</h1>
        <img src={activationCompleteImage} alt="" width={300} />
        <div className={styles.textContainer}>
          <div className={styles.recipeName}>
            {listing.package.verbose_name}
          </div>
          <div>is ready to use!</div>
          <br />
          <div>Go try it out now, or activate another blueprint.</div>
        </div>
      </div>
      <div className={styles.footer}>
        <AsyncButton className={styles.finishButton} onClick={onClickFinish}>
          {finishButtonCaption}
        </AsyncButton>
      </div>
    </div>
  );
};

export default ActivateRecipePanel;
