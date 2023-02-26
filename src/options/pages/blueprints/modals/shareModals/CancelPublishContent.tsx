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
import { useRecipe } from "@/recipes/recipesHooks";
import { Modal, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { selectShowPublishContext } from "@/options/pages/blueprints/modals/blueprintModalsSelectors";
import { blueprintModalsSlice } from "@/options/pages/blueprints/modals/blueprintModalsSlice";
import PublishContentLayout from "./PublishContentLayout";
import { produce } from "immer";
import {
  useGetEditablePackagesQuery,
  useUpdateRecipeMutation,
} from "@/services/api";
import notify from "@/utils/notify";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import { getErrorMessage } from "@/errors/errorHelpers";

const CancelPublishContent: React.FunctionComponent = () => {
  const [isCancelling, setCancelling] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { blueprintId } = useSelector(selectShowPublishContext);
  const { data: recipe, refetch: refetchRecipes } = useRecipe(blueprintId);
  const { data: editablePackages, isFetching: isFetchingEditablePackages } =
    useGetEditablePackagesQuery();

  const [updateRecipe] = useUpdateRecipeMutation();
  const dispatch = useDispatch();

  const closeModal = () => {
    dispatch(blueprintModalsSlice.actions.closeModal());
  };

  const confirmCancelPublish = async () => {
    setCancelling(true);
    setError(null);

    try {
      const newRecipe = produce(recipe, (draft) => {
        draft.sharing.public = false;
      });

      const packageId = editablePackages.find(
        (x) => x.name === newRecipe.metadata.id
      )?.id;

      await updateRecipe({
        packageId,
        recipe: newRecipe,
      }).unwrap();

      notify.success("Cancelled publish");

      closeModal();
      refetchRecipes();
    } catch (error) {
      if (
        isSingleObjectBadRequestError(error) &&
        error.response.data.config?.length > 0
      ) {
        setError(error.response.data.config.join(" "));
      } else {
        const message = getErrorMessage(error);
        setError(message);

        notify.error({
          message,
          error,
        });
      }

      setCancelling(false);
    }
  };

  return (
    <PublishContentLayout title="Cancel Publish?">
      <Modal.Body>
        {error && <div className="text-danger p-3">{error}</div>}

        <p>
          Your marketplace submission will not be published and the public link
          to your mod will no longer work.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="info" disabled={isCancelling} onClick={closeModal}>
          Never mind
        </Button>
        <Button
          variant="danger"
          disabled={isCancelling || isFetchingEditablePackages}
          onClick={confirmCancelPublish}
        >
          Yes, Cancel Publish
        </Button>
      </Modal.Footer>
    </PublishContentLayout>
  );
};

export default CancelPublishContent;
