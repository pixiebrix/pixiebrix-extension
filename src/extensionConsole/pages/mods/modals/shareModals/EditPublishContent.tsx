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
import { Modal, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { selectShowPublishContext } from "@/extensionConsole/pages/mods/modals/modModalsSelectors";
import { modModalsSlice } from "@/extensionConsole/pages/mods/modals/modModalsSlice";
import ActivationLink from "@/activation/ActivationLink";
import PublishContentLayout from "./PublishContentLayout";

import { MARKETPLACE_URL } from "@/urlConstants";
import { assertNotNullish } from "@/utils/nullishUtils";

const EditPublishContent: React.FunctionComponent = () => {
  const dispatch = useDispatch();

  const closeModal = () => {
    dispatch(modModalsSlice.actions.closeModal());
  };

  const cancelPublish = () => {
    dispatch(modModalsSlice.actions.setCancelingPublish());
  };

  const { modId: modId } = useSelector(selectShowPublishContext) ?? {};

  assertNotNullish(modId, "modId from publish context is nullish");

  return (
    <PublishContentLayout title="Edit Pending Publish">
      <Modal.Body>
        <p>
          The{" "}
          <a href={MARKETPLACE_URL} target="blank" rel="noreferrer noopener">
            PixieBrix Marketplace
          </a>{" "}
          admin team is working on publishing your mod. You&apos;ll receive an
          email when it is live in the Marketplace. Contact{" "}
          <a href="mailto:support@pixiebrix.com">support@pixiebrix.com</a> if
          you need help.
        </p>
        <p>
          While you wait, the public link below will work for anyone, so you can
          start sharing right away!
        </p>

        <p className="mb-1">Public link to share:</p>
        <ActivationLink modId={modId} />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="danger" onClick={cancelPublish}>
          Cancel Publish
        </Button>
        <Button variant="info" onClick={closeModal}>
          Close
        </Button>
      </Modal.Footer>
    </PublishContentLayout>
  );
};

export default EditPublishContent;
