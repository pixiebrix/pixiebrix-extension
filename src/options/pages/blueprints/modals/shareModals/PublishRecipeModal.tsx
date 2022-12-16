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
import { RequireScope } from "@/auth/RequireScope";
import ModalLayout from "@/options/pages/blueprints/modals/ModalLayout";
import PublishRecipeModalBody from "./PublishRecipeModalBody";
import { Modal } from "react-bootstrap";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import Loader from "@/components/Loader";
import { useRecipe } from "@/recipes/recipesHooks";
import ActivationLink from "./ActivationLink";

const ModalContent: React.FunctionComponent = () => {
  const showPublishContext = useSelector(selectShowPublishContext);
  const blueprintId = showPublishContext?.blueprintId;
  const { data: listings, isLoading: areListingsLoading } =
    useGetMarketplaceListingsQuery();
  const { data: recipe, isFetching: isFetchingRecipe } = useRecipe(blueprintId);

  if (isFetchingRecipe || areListingsLoading) {
    return (
      <Modal.Body>
        <Loader />
      </Modal.Body>
    );
  }

  if (!recipe.sharing.public) {
    return (
      <>
        <Modal.Header closeButton>
          <Modal.Title>Publish to Marketplace</Modal.Title>
        </Modal.Header>
        <RequireScope scopeSettingsDescription="To publish a blueprint, you must first set an account alias for your PixieBrix account">
          <PublishRecipeModalBody />
        </RequireScope>
      </>
    );
  }

  const marketplaceListing = listings[recipe.metadata.id];
  if (marketplaceListing == null) {
    return (
      <>
        <Modal.Header closeButton>
          <Modal.Title>Edit Pending Publish</Modal.Title>
        </Modal.Header>
        <Modal.Body>Publish pending</Modal.Body>
      </>
    );
  }

  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title>Published</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h3>{recipe.metadata.name}</h3>
        <p>Your blueprint has been published to the Marketplace.</p>
        <p className="mb-1">Public link to share:</p>
        <ActivationLink blueprintId={blueprintId} />
      </Modal.Body>
    </>
  );
};

const PublishRecipeModal: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const closeModal = () => {
    dispatch(blueprintModalsSlice.actions.closeModal());
  };

  const showPublishContext = useSelector(selectShowPublishContext);

  return (
    <Modal show={showPublishContext?.blueprintId != null} onHide={closeModal}>
      <ModalContent />
    </Modal>
  );

  return (
    <ModalLayout
      show={showPublishContext?.blueprintId != null}
      title="Publish to Marketplace"
      onHide={closeModal}
    >
      <RequireScope scopeSettingsDescription="To publish a blueprint, you must first set an account alias for your PixieBrix account">
        <PublishRecipeModalBody />
      </RequireScope>
    </ModalLayout>
  );
};

export default PublishRecipeModal;
