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
import { useOptionalModDefinition } from "@/modDefinitions/modDefinitionHooks";
import { Modal, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { selectShowPublishContext } from "@/extensionConsole/pages/mods/modals/modModalsSelectors";
import { modModalsSlice } from "@/extensionConsole/pages/mods/modals/modModalsSlice";
import PublishContentLayout from "./PublishContentLayout";
import { produce } from "immer";
import {
  useGetEditablePackagesQuery,
  useUpdateModDefinitionMutation,
} from "@/data/service/api";
import notify from "@/utils/notify";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import { getErrorMessage } from "@/errors/errorHelpers";
import { assertNotNullish } from "@/utils/nullishUtils";

const CancelPublishContent: React.FunctionComponent = () => {
  const [isCancelling, setCancelling] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { blueprintId: modId = null } =
    useSelector(selectShowPublishContext) ?? {};
  const { data: modDefinition, refetch: refetchModDefinitions } =
    useOptionalModDefinition(modId);
  const { data: editablePackages, isFetching: isFetchingEditablePackages } =
    useGetEditablePackagesQuery();

  const [updateModDefinition] = useUpdateModDefinitionMutation();
  const dispatch = useDispatch();

  const closeModal = () => {
    dispatch(modModalsSlice.actions.closeModal());
  };

  const confirmCancelPublish = async () => {
    setCancelling(true);
    setError(null);

    try {
      assertNotNullish(
        modDefinition,
        `modDefinition for modId: ${modId} is nullish`,
      );
      const newModDefinition = produce(modDefinition, (draft) => {
        draft.sharing.public = false;
      });

      assertNotNullish(editablePackages, "editablePackages is nullish");
      const packageId = editablePackages.find(
        (x) => x.name === newModDefinition.metadata.id,
      )?.id;

      assertNotNullish(
        packageId,
        `packageId for metadata id ${newModDefinition.metadata.id} is nullish`,
      );
      await updateModDefinition({
        packageId,
        modDefinition: newModDefinition,
      }).unwrap();

      notify.success("Cancelled publish");

      closeModal();
      refetchModDefinitions();
    } catch (error) {
      if (
        isSingleObjectBadRequestError(error) &&
        Number(error.response.data.config?.length) > 0
      ) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- length check above
        setError(error.response.data.config!.join(" "));
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
