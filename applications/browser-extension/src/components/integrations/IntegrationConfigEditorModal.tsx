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

import styles from "./IntegrationConfigEditorModal.module.scss";

import optionsRegistry from "../fields/optionsRegistry";
import React, { useCallback, useMemo } from "react";
import { Button, Modal } from "react-bootstrap";
import AsyncButton from "../AsyncButton";
import { truncate } from "lodash";
import genericOptionsFactory, {
  type BrickOptionProps,
} from "../fields/schemaFields/genericOptionsFactory";
import useSetDocumentTitle from "@/hooks/useSetDocumentTitle";
import ConnectedFieldTemplate from "../form/ConnectedFieldTemplate";
import FieldRuntimeContext, {
  type RuntimeContext,
} from "../fields/schemaFields/FieldRuntimeContext";
import Form, {
  type OnSubmit,
  type RenderBody,
  type RenderSubmit,
} from "../form/Form";
import {
  type Integration,
  type IntegrationConfig,
} from "../../integrations/integrationTypes";
import { type UUID } from "../../types/stringTypes";
import { DEFAULT_RUNTIME_API_VERSION } from "../../runtime/apiVersionOptions";
import useAsyncState from "@/hooks/useAsyncState";
import AsyncStateGate from "../AsyncStateGate";
import type * as Yup from "yup";
import {
  createYupValidationSchema,
  validateIntegrationConfig,
} from "./integrationHelpers";

export type IntegrationConfigEditorModalProps = {
  /**
   * The integration of the config being edited
   */
  integration: Integration | null;

  /**
   * The initial integration config form values
   */
  initialValues: IntegrationConfig | null;

  /**
   * Callback when the user clicks the save button
   * @param config The integration config form values to save
   */
  onSave: (config: IntegrationConfig) => Promise<void>;

  /**
   * Callback when the modal is closed
   */
  onClose: () => void;

  /**
   * Callback when the user clicks the delete button. If not provided, the delete button will not be shown.
   * @param id The id of the integration config to delete
   */
  onDelete?: (id: UUID) => void;
};

const FORM_RUNTIME_CONTEXT: RuntimeContext = {
  apiVersion: DEFAULT_RUNTIME_API_VERSION,
  allowExpressions: false,
};

/**
 * The modal content assumes integration and initialValues are not null
 */
type ContentProps = {
  integration: Integration;
  initialValues: IntegrationConfig;
  onSave: (config: IntegrationConfig) => Promise<void>;
  onClose: () => void;
  onDelete?: (id: UUID) => void;
};

const ModalContent: React.FC<ContentProps> = ({
  integration,
  initialValues,
  onSave,
  onClose,
  onDelete,
}) => {
  useSetDocumentTitle(
    `Configure ${truncate(integration.name, { length: 15 })}`,
  );

  const onSubmit = useCallback<OnSubmit<IntegrationConfig>>(
    async (newIntegrationConfig) => {
      await onSave(newIntegrationConfig);
      onClose();
    },
    [onSave, onClose],
  );

  const Editor = useMemo<React.FC<BrickOptionProps> | undefined>(() => {
    if (optionsRegistry.has(integration.id)) {
      return optionsRegistry.get(integration.id);
    }

    return genericOptionsFactory(integration.schema, integration.uiSchema);
  }, [integration]);

  const validationSchemaState = useAsyncState<Yup.AnyObjectSchema>(
    async () => createYupValidationSchema(integration),
    [integration.schema],
  );

  const renderBody: RenderBody = () => (
    <Modal.Body>
      <FieldRuntimeContext.Provider value={FORM_RUNTIME_CONTEXT}>
        <ConnectedFieldTemplate
          name="label"
          label="Label"
          description="A label to help identify this integration"
          blankValue=""
        />
        <ConnectedFieldTemplate
          label="Integration"
          name="integrationId"
          type="text"
          plaintext
          readOnly
        />
        {Editor && <Editor name="config" />}
      </FieldRuntimeContext.Provider>
    </Modal.Body>
  );

  const renderSubmit: RenderSubmit = ({ isSubmitting, isValid }) => (
    <Modal.Footer>
      <div className="d-flex w-100">
        <div className="flex-grow-1">
          {onDelete && (
            <AsyncButton
              variant="outline-danger"
              onClick={() => {
                onDelete(initialValues.id);
              }}
            >
              Delete
            </AsyncButton>
          )}
        </div>
        <div>
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting || !isValid}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal.Footer>
  );

  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title>
          Configure Local Integration: {integration.name}
        </Modal.Title>
      </Modal.Header>

      <AsyncStateGate state={validationSchemaState}>
        {({ data: validationSchema }) => (
          <Form
            validationSchema={validationSchema}
            validate={async (values) =>
              (await validateIntegrationConfig(integration))(values)
            }
            initialValues={initialValues}
            onSubmit={onSubmit}
            renderBody={renderBody}
            renderSubmit={renderSubmit}
          />
        )}
      </AsyncStateGate>
    </>
  );
};

const IntegrationConfigEditorModal: React.FunctionComponent<
  IntegrationConfigEditorModalProps
> = ({ integration, initialValues, onSave, onClose, onDelete }) => {
  const show = initialValues != null && integration != null;

  return (
    <Modal
      show={show}
      dialogClassName={styles.dialog}
      onHide={onClose}
      backdrop="static"
      keyboard={false}
    >
      {show && (
        <ModalContent
          integration={integration}
          initialValues={initialValues}
          onSave={onSave}
          onClose={onClose}
          onDelete={onDelete}
        />
      )}
    </Modal>
  );
};

export default IntegrationConfigEditorModal;
