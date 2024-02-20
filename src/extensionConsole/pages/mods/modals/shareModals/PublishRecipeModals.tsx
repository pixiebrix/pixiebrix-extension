/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import { selectShowPublishContext } from "@/extensionConsole/pages/mods/modals/modModalsSelectors";
import { modModalsSlice } from "@/extensionConsole/pages/mods/modals/modModalsSlice";
import PublishRecipeContent from "./PublishRecipeContent";
import { Modal } from "react-bootstrap";
import { useGetMarketplaceListingQuery } from "@/services/api";
import Loader from "@/components/Loader";
import { useOptionalModDefinition } from "@/modDefinitions/modDefinitionHooks";
import EditPublishContent from "./EditPublishContent";
import CancelPublishContent from "./CancelPublishContent";
import PublishedContent from "./PublishedContent";

const ModalContentSwitch: React.FunctionComponent = () => {
  const showPublishContext = useSelector(selectShowPublishContext);
  const { blueprintId: modId, cancelingPublish } = showPublishContext;
  const { data: listing, isLoading: isLoadingListing } =
    useGetMarketplaceListingQuery({ packageId: modId });
  const { data: modDefinition, isLoading: isLoadingRecipe } =
    useOptionalModDefinition(modId);

  if (isLoadingRecipe || isLoadingListing) {
    return (
      <Modal.Body>
        <Loader />
      </Modal.Body>
    );
  }

  if (!modDefinition.sharing.public) {
    return <PublishRecipeContent />;
  }

  // A mod is pending publish if it has been made public but does not yet have a marketplace listing
  if (!listing) {
    return cancelingPublish ? <CancelPublishContent /> : <EditPublishContent />;
  }

  // Normally we shouldn't get here, because the Publish action is not displayed for a published blueprint
  return <PublishedContent />;
};

const PublishRecipeModals: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const closeModal = () => {
    dispatch(modModalsSlice.actions.closeModal());
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
