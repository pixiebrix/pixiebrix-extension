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

import { useRecipe } from "@/recipes/recipesHooks";
import React from "react";
import { Modal, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { selectShowPublishContext } from "@/options/pages/blueprints/modals/blueprintModalsSelectors";
import { blueprintModalsSlice } from "@/options/pages/blueprints/modals/blueprintModalsSlice";
import ActivationLink from "./ActivationLink";
import PublishContentLayout from "./PublishContentLayout";

const EditPublishContent: React.FunctionComponent = () => {
  const dispatch = useDispatch();

  const closeModal = () => {
    dispatch(blueprintModalsSlice.actions.closeModal());
  };

  const confirmCancelPublish = () => {
    dispatch(blueprintModalsSlice.actions.setCancelingPublish());
  };

  const { blueprintId } = useSelector(selectShowPublishContext);
  const { data: recipe } = useRecipe(blueprintId);

  return (
    <PublishContentLayout title="Edit Pending Publish">
      <Modal.Body>
        <h3>{recipe.metadata.name}</h3>

        <p>
          The{" "}
          <a
            href="https://www.pixiebrix.com/marketplace/"
            target="blank"
            rel="noreferrer noopener"
          >
            PixieBrix Marketplace
          </a>{" "}
          admin team is working on publishing your blueprint. You&apos;ll
          receive an email when it is live in the Marketplace. Contact{" "}
          <a href="mailto:support@pixiebrix.com">support@pixiebrix.com</a> if
          you need help.
        </p>
        <p>
          While you wait, the public link below will work for anyone, so you can
          start sharing right away!
        </p>

        <p className="mb-1">Public link to share:</p>
        <ActivationLink blueprintId={blueprintId} />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="danger" onClick={confirmCancelPublish}>
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
