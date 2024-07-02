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

import React, { useCallback, useMemo } from "react";
import { Button, Modal } from "react-bootstrap";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import { useDispatch, useSelector } from "react-redux";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import {
  selectActiveModComponentFormState,
  selectEditorModalVisibilities,
  selectActivatedModMetadatas,
} from "@/pageEditor/slices/editorSelectors";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import notify from "@/utils/notify";
import Form, {
  type OnSubmit,
  type RenderBody,
  type RenderSubmit,
} from "@/components/form/Form";
import { object, string } from "yup";
import RadioItemListWidget from "@/components/form/widgets/radioItemList/RadioItemListWidget";
import { type RadioItem } from "@/components/form/widgets/radioItemList/radioItemListWidgetTypes";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import { type RegistryId } from "@/types/registryTypes";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { useRemoveModComponentFromStorage } from "@/pageEditor/hooks/useRemoveModComponentFromStorage";
import { assertNotNullish } from "@/utils/nullishUtils";

type FormState = {
  modId: RegistryId | null;
  moveOrCopy: "move" | "copy";
};

const initialFormState: FormState = {
  modId: null,
  moveOrCopy: "move",
};

const NEW_MOD_ID = "@new" as RegistryId;

const formStateSchema = object({
  modId: string().required(),
  moveOrCopy: string().oneOf(["move", "copy"]).required(),
});

const AddToModModal: React.FC = () => {
  const { isAddToModModalVisible: show } = useSelector(
    selectEditorModalVisibilities,
  );
  const activatedModMetadatas = useSelector(selectActivatedModMetadatas);
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  const removeModComponentFromStorage = useRemoveModComponentFromStorage();

  const modMetadataById = useMemo(() => {
    const result: Record<RegistryId, ModComponentBase["_recipe"]> = {};
    for (const metadata of activatedModMetadatas) {
      result[metadata.id] = metadata;
    }

    return result;
  }, [activatedModMetadatas]);

  const dispatch = useDispatch();

  const hideModal = useCallback(() => {
    dispatch(editorActions.hideModal());
  }, [dispatch]);

  const onSubmit: OnSubmit<FormState> = async (
    { modId, moveOrCopy },
    helpers,
  ) => {
    assertNotNullish(modId, "Mod id must be defined");
    const keepLocalCopy = moveOrCopy === "copy";

    if (modId === NEW_MOD_ID) {
      dispatch(editorActions.showCreateModModal({ keepLocalCopy }));
      return;
    }

    // eslint-disable-next-line security/detect-object-injection -- mod id is from select options
    const modMetadata = modMetadataById[modId];

    try {
      const modComponentId = activeModComponentFormState?.uuid;
      assertNotNullish(modComponentId, "modComponentId must be defined");
      dispatch(
        editorActions.addModComponentFormStateToMod({
          modComponentId,
          modMetadata,
          keepLocalCopy,
        }),
      );
      if (!keepLocalCopy) {
        await removeModComponentFromStorage({
          modComponentId,
        });
      }

      // Need to setSubmitting to false before hiding the modal,
      // otherwise the form will be unmounted before the state update
      helpers.setSubmitting(false);

      hideModal();
    } catch (error) {
      if (isSingleObjectBadRequestError(error) && error.response?.data.config) {
        helpers.setStatus(error.response.data.config);
        return;
      }

      notify.error({
        message: "Problem adding to mod",
        error,
      });

      helpers.setSubmitting(false);
    }
  };

  const selectOptions = useMemo(
    () => [
      { label: "➕ Create new mod...", value: NEW_MOD_ID },
      ...activatedModMetadatas.map((metadata) => ({
        label: metadata.name,
        value: metadata.id,
      })),
    ],
    [activatedModMetadatas],
  );

  const radioItems: RadioItem[] = useMemo(
    () => [
      {
        label: "Move into the selected mod",
        value: "move",
      },
      {
        label: "Create a copy in the selected mod",
        value: "copy",
      },
    ],
    [],
  );

  const renderBody: RenderBody = useCallback(
    () => (
      <Modal.Body>
        <ConnectedFieldTemplate
          name="modId"
          hideLabel
          description="Choose a mod"
          as={SelectWidget}
          options={selectOptions}
        />
        <ConnectedFieldTemplate
          name="moveOrCopy"
          hideLabel
          as={RadioItemListWidget}
          items={radioItems}
          header="Move or copy the starter brick?"
        />
      </Modal.Body>
    ),
    [radioItems, selectOptions],
  );

  const renderSubmit: RenderSubmit = useCallback(
    ({ isSubmitting, isValid, values: { moveOrCopy } }) => (
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
    ),
    [hideModal],
  );

  return (
    <Modal show={show} onHide={hideModal}>
      <Modal.Header closeButton>
        <Modal.Title>
          Add <em>{activeModComponentFormState?.label}</em> to a mod
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

export default AddToModModal;
