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
import PublishModContent from "./PublishModContent";
import { Modal } from "react-bootstrap";
import { useGetMarketplaceListingQuery } from "@/data/service/api";
import Loader from "@/components/Loader";
import { useOptionalModDefinition } from "@/modDefinitions/modDefinitionHooks";
import EditPublishContent from "./EditPublishContent";
import CancelPublishContent from "./CancelPublishContent";
import PublishedContent from "./PublishedContent";
import { assertNotNullish } from "@/utils/nullishUtils";

const ModalContentSwitch: React.FunctionComponent = () => {
  const showPublishContext = useSelector(selectShowPublishContext);
  const { modId: modId, cancelingPublish } = showPublishContext ?? {};
  assertNotNullish(modId, "modId not found in showPublishContext");
  const { data: listing, isLoading: isLoadingListing } =
    useGetMarketplaceListingQuery({ packageId: modId });
  const { data: modDefinition, isLoading: isLoadingModDefinition } =
    useOptionalModDefinition(modId);

  if (isLoadingModDefinition || isLoadingListing) {
    return (
      <Modal.Body>
        <Loader />
      </Modal.Body>
    );
  }

  if (!modDefinition?.sharing.public) {
    return <PublishModContent />;
  }

  // A mod is pending publish if it has been made public but does not yet have a marketplace listing
  if (!listing) {
    return cancelingPublish ? <CancelPublishContent /> : <EditPublishContent />;
  }

  // Normally we shouldn't get here, because the Publish action is not displayed for a published blueprint
  return <PublishedContent />;
};

const PublishModModals: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const closeModal = () => {
    dispatch(modModalsSlice.actions.closeModal());
  };

  const showPublishContext = useSelector(selectShowPublishContext);
  const showPublishModModal = showPublishContext?.modId != null;

  return (
    <Modal show={showPublishModModal} onHide={closeModal}>
      {showPublishModModal && <ModalContentSwitch />}
    </Modal>
  );
};

export default PublishModModals;
