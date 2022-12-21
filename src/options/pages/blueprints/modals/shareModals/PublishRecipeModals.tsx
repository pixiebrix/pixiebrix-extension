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

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectShowPublishContext } from "@/options/pages/blueprints/modals/blueprintModalsSelectors";
import { blueprintModalsSlice } from "@/options/pages/blueprints/modals/blueprintModalsSlice";
import PublishRecipeContent from "./PublishRecipeContent";
import { Modal } from "react-bootstrap";
import { appApi } from "@/services/api";
import Loader from "@/components/Loader";
import { useRecipe } from "@/recipes/recipesHooks";
import EditPublishContent from "./EditPublishContent";
import CancelPublishContent from "./CancelPublishContent";
import { isRecipePublished } from "@/options/pages/blueprints/utils/installableUtils";
import PublishedContent from "./PublishedContent";

const ModalContentSwitch: React.FunctionComponent = () => {
  const showPublishContext = useSelector(selectShowPublishContext);
  const { blueprintId, cancelingPublish } = showPublishContext;
  const { data: listings, isLoading: areListingsLoading } =
    appApi.endpoints.getMarketplaceListings.useQueryState();
  const { data: recipe, isFetching: isFetchingRecipe } = useRecipe(blueprintId);

  if (isFetchingRecipe || areListingsLoading) {
    return (
      <Modal.Body>
        <Loader />
      </Modal.Body>
    );
  }

  if (!recipe.sharing.public) {
    return <PublishRecipeContent />;
  }

  if (isRecipePublished(recipe, listings)) {
    return cancelingPublish ? <CancelPublishContent /> : <EditPublishContent />;
  }

  // Normally we shouldn't get here, because the Publish action is not displayed for a published blueprint
  return <PublishedContent />;
};

const PublishRecipeModals: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const closeModal = () => {
    dispatch(blueprintModalsSlice.actions.closeModal());
  };

  const showPublishContext = useSelector(selectShowPublishContext);
  const showPublishRecipeModal = showPublishContext?.blueprintId != null;

  return (
    <Modal show={showPublishRecipeModal} onHide={closeModal}>
      {showPublishRecipeModal && <ModalContentSwitch />}
    </Modal>
  );
};

export default PublishRecipeModals;
