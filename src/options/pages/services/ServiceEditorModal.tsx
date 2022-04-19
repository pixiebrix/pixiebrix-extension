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

import styles from "./ServiceEditorModal.module.scss";

import optionsRegistry from "@/components/fields/optionsRegistry";
import React, { useCallback, useMemo } from "react";
import { Modal, Button } from "react-bootstrap";
import AsyncButton from "@/components/AsyncButton";
import { IService, RawServiceConfiguration, UUID } from "@/core";
import { dereference } from "@/validators/generic";
import { cloneDeep, truncate } from "lodash";
import { useAsyncState } from "@/hooks/common";
import genericOptionsFactory from "@/components/fields/schemaFields/genericOptionsFactory";
import { buildYup } from "schema-to-yup";
import * as Yup from "yup";
import reportError from "@/telemetry/reportError";
import { useTitle } from "@/hooks/title";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import FieldTemplate from "@/components/form/FieldTemplate";
import FieldRuntimeContext, {
  RuntimeContext,
} from "@/components/fields/schemaFields/FieldRuntimeContext";
import { OPTIONS_DEFAULT_RUNTIME_API_VERSION } from "@/options/constants";
import Form, {
  OnSubmit,
  RenderBody,
  RenderSubmit,
} from "@/components/form/Form";

export type OwnProps = {
  configuration: RawServiceConfiguration;
  service: IService;
  onClose: () => void;
  onDelete?: (id: UUID) => void;
  onSave: (config: RawServiceConfiguration) => Promise<void>;
};

const FORM_RUNTIME_CONTEXT: RuntimeContext = {
  apiVersion: OPTIONS_DEFAULT_RUNTIME_API_VERSION,
  allowExpressions: false,
};

const ServiceEditorModal: React.FunctionComponent<OwnProps> = ({
  configuration: originalConfiguration,
  service,
  onClose,
  onDelete,
  onSave,
}) => {
  useTitle(`Configure ${truncate(service.name, { length: 15 })}`);

  const onSubmit = useCallback<OnSubmit<RawServiceConfiguration>>(
    async (values, helpers) => {
      helpers.setSubmitting(true);
      await onSave(values);
    },
    [onSave]
  );

  const Editor = useMemo(() => {
    if (optionsRegistry.has(service.id)) {
      return optionsRegistry.get(service.id);
    }

    return genericOptionsFactory(service.schema);
  }, [service]);

  const schemaPromise = useMemo(
    async () =>
      dereference({
        type: "object",
        properties: {
          organization: {
            type: "string",
          },
          label: {
            type: "string",
            // @ts-expect-error -- expects JSONSchema7 type `required: string[]`
            // (one level up), but only works with JSONSchema4 `required: boolean`
            required: true,
          },
          // $RefParse mutates the schema
          config: cloneDeep(service.schema),
        },
      }),
    [service.schema]
  );

  const [schema] = useAsyncState(schemaPromise);

  const validationSchema = useMemo(() => {
    if (!schema) {
      return Yup.object();
    }

    try {
      // The dereferenced schema is frozen, buildYup can mutate it, so we need to "unfreeze" the schema
      return buildYup(cloneDeep(schema), {});
    } catch (error) {
      console.error("Error building Yup validator from JSON Schema");
      reportError(error);
      return Yup.object();
    }
  }, [schema]);

  if (!schema) {
    return null;
  }

  const renderBody: RenderBody = () => (
    <Modal.Body>
      <FieldRuntimeContext.Provider value={FORM_RUNTIME_CONTEXT}>
        <ConnectedFieldTemplate
          name="label"
          label="Label"
          description="A label to help identify this integration"
          blankValue=""
        />
        <FieldTemplate
          label="Integration"
          name="service"
          type="text"
          plaintext
          readOnly
          value={service.id}
        />
        <Editor name="config" />
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
                onDelete(originalConfiguration.id);
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
    <Modal
      show
      dialogClassName={styles.dialog}
      onHide={onClose}
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title>Configure Private Integration: {service.name}</Modal.Title>
      </Modal.Header>

      <Form
        validationSchema={validationSchema}
        initialValues={originalConfiguration}
        onSubmit={onSubmit}
        renderBody={renderBody}
        renderSubmit={renderSubmit}
      />
    </Modal>
  );
};

export default ServiceEditorModal;
