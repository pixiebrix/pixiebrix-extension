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
import { useDispatch, useSelector } from "react-redux";
import {
  actions as editorActions,
  actions,
} from "@/pageEditor/store/editor/editorSlice";
import {
  selectActivatedModMetadatas,
  selectActiveModComponentFormState,
  selectEditorModalVisibilities,
  selectKeepLocalCopyOnCreateMod,
} from "@/pageEditor/store/editor/editorSelectors";
import notify from "@/utils/notify";
import { Button, Modal } from "react-bootstrap";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { object, string } from "yup";
import Form, {
  type OnSubmit,
  type RenderBody,
  type RenderSubmit,
} from "@/components/form/Form";
import { assertNotNullish } from "@/utils/nullishUtils";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import type { RegistryId } from "@/types/registryTypes";
import { useRemoveModComponentFromStorage } from "@/pageEditor/hooks/useRemoveModComponentFromStorage";
import { getUnsavedModMetadataForFormState } from "@/pageEditor/utils";

type FormState = {
  modId: RegistryId | null;
};

const initialFormState: FormState = {
  modId: null,
};

const formStateSchema = object({
  modId: string().required(),
});

const NEW_MOD_ID = "@new" as RegistryId;

const MoveFromModModal: React.FC = () => {
  const dispatch = useDispatch();

  const { isMoveFromModModalVisible: show } = useSelector(
    selectEditorModalVisibilities,
  );
  const hideModal = useCallback(() => {
    dispatch(actions.hideModal());
  }, [dispatch]);

  const modComponentFormState = useSelector(selectActiveModComponentFormState);
  const activatedModMetadatas = useSelector(selectActivatedModMetadatas);
  const keepLocalCopy = useSelector(selectKeepLocalCopyOnCreateMod);
  const removeModComponentFromStorage = useRemoveModComponentFromStorage();

  /**
   * The modId input here will always either be the NEW_MOD_ID placeholder,
   * or the ID of an existing mod in the mod metadatas in the activated mod
   * components, because that is what is used to create the form field dropdown,
   * which is where the submit value comes from.
   */
  const onSubmit = useCallback<OnSubmit<{ modId: RegistryId }>>(
    async ({ modId }, helpers) => {
      assertNotNullish(
        modComponentFormState,
        "active mod component form state not found",
      );
      const modMetadata =
        modId === NEW_MOD_ID
          ? getUnsavedModMetadataForFormState(modComponentFormState)
          : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Mod metadata must either be new or found in the activated mod metadatas
            activatedModMetadatas.find((metadata) => metadata.id === modId)!;
      try {
        const modComponentId = modComponentFormState?.uuid;
        assertNotNullish(
          modComponentId,
          "mod component id not found for active mod component",
        );

        dispatch(editorActions.duplicateActiveModComponent({ modMetadata }));

        if (!keepLocalCopy) {
          await removeModComponentFromStorage({ modComponentId });
        }

        hideModal();
      } catch (error) {
        notify.error({
          message: `Problem ${
            keepLocalCopy ? "copying to" : "moving from"
          } mod`,
          error,
        });
      } finally {
        helpers.setSubmitting(false);
      }
    },
    [
      modComponentFormState,
      activatedModMetadatas,
      dispatch,
      keepLocalCopy,
      hideModal,
      removeModComponentFromStorage,
    ],
  );

  const selectOptions = useMemo(
    () => [
      { label: "➕ Create new mod...", value: NEW_MOD_ID },
      ...activatedModMetadatas
        .filter(
          (metadata) => metadata.id !== modComponentFormState?.modMetadata?.id,
        )
        .map((metadata) => ({
          label: metadata.name,
          value: metadata.id,
        })),
    ],
    [activatedModMetadatas, modComponentFormState?.modMetadata?.id],
  );

  const renderBody: RenderBody = ({ values }) => (
    <Modal.Body>
      <ConnectedFieldTemplate
        name="modId"
        hideLabel
        description="Choose a mod"
        as={SelectWidget}
        options={selectOptions}
      />
    </Modal.Body>
  );

  const renderSubmit: RenderSubmit = ({ isSubmitting, isValid, values }) => (
    <Modal.Footer>
      <Button variant="info" onClick={hideModal}>
        Cancel
      </Button>
      <Button
        variant="primary"
        type="submit"
        disabled={!isValid || isSubmitting}
      >
        {keepLocalCopy ? "Copy" : "Move"}
      </Button>
    </Modal.Footer>
  );

  return (
    <Modal show={show} onHide={hideModal}>
      <Modal.Header closeButton>
        {keepLocalCopy ? (
          <Modal.Title>
            Copy <em>{modComponentFormState?.label}</em> to another Mod?
          </Modal.Title>
        ) : (
          <Modal.Title>
            Move <em>{modComponentFormState?.label}</em> to another Mod?
          </Modal.Title>
        )}
      </Modal.Header>
      <Form
        initialValues={initialFormState}
        validationSchema={formStateSchema}
        onSubmit={onSubmit}
        renderBody={renderBody}
        renderSubmit={renderSubmit}
      />
    </Modal>
  );
};

export default MoveFromModModal;
