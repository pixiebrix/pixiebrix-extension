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
import { Button, Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { selectShowPublishContext } from "@/extensionConsole/pages/mods/modals/modModalsSelectors";
import { modModalsSlice } from "@/extensionConsole/pages/mods/modals/modModalsSlice";
import { getErrorMessage } from "@/errors/errorHelpers";
import {
  useGetEditablePackagesQuery,
  useUpdateModDefinitionMutation,
} from "@/data/service/api";
import notify from "@/utils/notify";
import { produce } from "immer";
import ActivationLink from "@/activation/ActivationLink";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import { useOptionalModDefinition } from "@/modDefinitions/modDefinitionHooks";
import PublishContentLayout from "./PublishContentLayout";

import { MARKETPLACE_URL } from "@/urlConstants";
import { assertNotNullish } from "@/utils/nullishUtils";

const PublishModContent: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const { blueprintId: modId } = useSelector(selectShowPublishContext) ?? {};
  assertNotNullish(modId, "modId from publish context is nullish");

  const [updateModDefinition] = useUpdateModDefinitionMutation();
  const { data: editablePackages, isFetching: isFetchingEditablePackages } =
    useGetEditablePackagesQuery();
  const { data: modDefinition, refetch: refetchModDefinition } =
    useOptionalModDefinition(modId);

  const [isPublishing, setPublishing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const closeModal = () => {
    dispatch(modModalsSlice.actions.closeModal());
  };

  const publish = async () => {
    setPublishing(true);
    setError(null);

    try {
      assertNotNullish(
        modDefinition,
        `modDefinition for modId: ${modId} is nullish`,
      );
      const newModDefinition = produce(modDefinition, (draft) => {
        draft.sharing.public = true;
      });

      assertNotNullish(editablePackages, "editablePackages is nullish");
      const packageId = editablePackages.find(
        (x) => x.name === newModDefinition.metadata.id,
      )?.id;

      assertNotNullish(
        packageId,
        `packageId metadata id: ${newModDefinition.metadata.id} is nullish`,
      );
      await updateModDefinition({
        packageId,
        modDefinition: newModDefinition,
      }).unwrap();

      notify.success("Shared brick");
      closeModal();
      refetchModDefinition();
    } catch (error) {
      if (
        isSingleObjectBadRequestError(error) &&
        Number(error.response.data.config?.length) > 0
      ) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- Length check above
        setError(error.response.data.config!.join(" "));
      } else {
        const message = getErrorMessage(error);
        setError(message);

        notify.error({
          message,
          error,
        });
      }

      setPublishing(false);
    }
  };

  return (
    <PublishContentLayout title="Publish to Marketplace">
      <Modal.Body>
        {error && <div className="text-danger p-3">{error}</div>}

        <p>
          On Submit, the public link to this mod will be shared with the{" "}
          <a href={MARKETPLACE_URL} target="blank" rel="noreferrer noopener">
            PixieBrix Marketplace
          </a>{" "}
          admin team, who will review your submission and publish your mod.
        </p>
        <p>
          As soon as you Submit, the public link below will work for anyone, so
          you can start sharing right away!
        </p>

        <p className="mb-1">Public link to share:</p>
        <ActivationLink modId={modId} />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="link" disabled={isPublishing} onClick={closeModal}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={isPublishing || isFetchingEditablePackages}
          onClick={publish}
        >
          Submit
        </Button>
      </Modal.Footer>
    </PublishContentLayout>
  );
};

export default PublishModContent;
