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

import React, { useCallback, useMemo } from "react";
import { Button, Modal } from "react-bootstrap";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import { useDispatch, useSelector } from "react-redux";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import {
  selectActiveElement,
  selectInstalledRecipeMetadatas,
} from "@/pageEditor/slices/editorSelectors";
import { RecipeMetadata, RegistryId } from "@/core";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import notify from "@/utils/notify";
import Form, {
  OnSubmit,
  RenderBody,
  RenderSubmit,
} from "@/components/form/Form";
import { isAxiosError } from "@/errors";
import { object, string } from "yup";
import RadioItemListWidget from "@/components/form/widgets/radioItemList/RadioItemListWidget";
import { RadioItem } from "@/components/form/widgets/radioItemList/radioItemListWidgetTypes";
import useRemoveExtension from "@/pageEditor/hooks/useRemoveExtension";

type FormState = {
  recipeId: RegistryId;
  moveOrCopy: "move" | "copy";
};

const initialFormState: FormState = {
  recipeId: null,
  moveOrCopy: "move",
};

const NEW_RECIPE_ID = "@new" as RegistryId;

const formStateSchema = object({
  recipeId: string().required(),
  moveOrCopy: string().oneOf(["move", "copy"]).required(),
});

const AddToRecipeModal: React.VFC = () => {
  const recipeMetadatas = useSelector(selectInstalledRecipeMetadatas);
  const activeElement = useSelector(selectActiveElement);
  const removeExtension = useRemoveExtension();

  const recipeMetadataById = useMemo(() => {
    const result: Record<RegistryId, RecipeMetadata> = {};
    for (const metadata of recipeMetadatas) {
      result[metadata.id] = metadata;
    }

    return result;
  }, [recipeMetadatas]);

  const dispatch = useDispatch();

  const hideModal = useCallback(() => {
    dispatch(editorActions.hideAddToRecipeModal());
  }, [dispatch]);

  const onSubmit = useCallback<OnSubmit<FormState>>(
    async ({ recipeId, moveOrCopy }, helpers) => {
      const keepLocalCopy = moveOrCopy === "copy";

      if (recipeId === NEW_RECIPE_ID) {
        dispatch(editorActions.transitionAddToCreateRecipeModal(keepLocalCopy));
        return;
      }

      // eslint-disable-next-line security/detect-object-injection -- recipe id is from select options
      const recipeMetadata = recipeMetadataById[recipeId];

      try {
        const elementId = activeElement.uuid;
        dispatch(
          editorActions.addElementToRecipe({
            elementId,
            recipeMetadata,
            keepLocalCopy,
          })
        );
        if (!keepLocalCopy) {
          await removeExtension({
            extensionId: elementId,
            shouldShowConfirmation: false,
          });
        }

        hideModal();
      } catch (error: unknown) {
        if (isAxiosError(error) && error.response.data.config) {
          helpers.setStatus(error.response.data.config);
          return;
        }

        notify.error({
          message: "Problem adding extension to blueprint",
          error,
        });
      } finally {
        helpers.setSubmitting(false);
      }
    },
    [activeElement.uuid, dispatch, hideModal, recipeMetadataById]
  );

  const selectOptions = [
    { label: "➕ Create new blueprint...", value: NEW_RECIPE_ID },
    ...recipeMetadatas.map((metadata) => ({
      label: metadata.name,
      value: metadata.id,
    })),
  ];

  const radioItems: RadioItem[] = [
    {
      label: "Move the extension into the blueprint",
      value: "move",
    },
    {
      label: "Create a copy of the extension in the blueprint",
      value: "copy",
    },
  ];

  const renderBody: RenderBody = () => (
    <Modal.Body>
      <ConnectedFieldTemplate
        name="recipeId"
        hideLabel
        description="Choose a blueprint"
        as={SelectWidget}
        options={selectOptions}
        widerLabel
      />
      <ConnectedFieldTemplate
        name="moveOrCopy"
        hideLabel
        as={RadioItemListWidget}
        items={radioItems}
        header="Move or copy the extension?"
      />
    </Modal.Body>
  );

  const renderSubmit: RenderSubmit = ({
    isSubmitting,
    isValid,
    values: { moveOrCopy },
  }) => (
    <Modal.Footer>
      <Button variant="info" onClick={hideModal}>
        Cancel
      </Button>
      <Button
        variant="primary"
        type="submit"
        disabled={!isValid || isSubmitting}
      >
        {moveOrCopy === "move" ? "Move" : "Copy"}
      </Button>
    </Modal.Footer>
  );

  return (
    <Modal show onHide={hideModal}>
      <Modal.Header closeButton>
        <Modal.Title>
          Add <em>{activeElement?.label}</em> to a blueprint
        </Modal.Title>
      </Modal.Header>
      <Form
        validationSchema={formStateSchema}
        validateOnMount
        initialValues={initialFormState}
        onSubmit={onSubmit}
        renderBody={renderBody}
        renderSubmit={renderSubmit}
      />
    </Modal>
  );
};

export default AddToRecipeModal;
