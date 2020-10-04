import React, { useCallback, useMemo } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import AsyncButton from "@/components/AsyncButton";
import { IService, RawServiceConfiguration } from "@/core";
import Form from "react-bootstrap/Form";
import { Formik, FormikHelpers, FormikValues } from "formik";
import { dereference } from "@/validators/generic";
import cloneDeep from "lodash/cloneDeep";
import { useAsyncState } from "@/hooks/common";
import genericOptionsFactory from "@/components/fields/blockOptions";
import { buildYup } from "schema-to-yup";

interface OwnProps {
  configuration: RawServiceConfiguration;
  service: IService;
  onClose: () => void;
  onDelete: (id: string) => void;
  onSave: (config: RawServiceConfiguration) => Promise<void>;
}

const ServiceEditorModal: React.FunctionComponent<OwnProps> = ({
  configuration: originalConfiguration,
  service,
  onClose,
  onDelete,
  onSave,
}) => {
  const handleSave = useCallback(
    async (values: FormikValues, actions: FormikHelpers<FormikValues>) => {
      actions.setSubmitting(true);
      await onSave(values as any);
    },
    [onSave]
  );

  const Editor = useMemo(() => genericOptionsFactory(service.schema), [
    service,
  ]);

  const schemaPromise = useMemo(
    () =>
      dereference({
        type: "object",
        properties: {
          organization: {
            type: "string",
          },
          label: {
            type: "string",
          },
          // $RefParse mutates the schema
          config: cloneDeep(service.schema),
        },
      }),
    [service.schema]
  );

  const [schema] = useAsyncState(schemaPromise);

  if (!schema) {
    return null;
  }

  return (
    <Modal show onHide={onClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Configure Private Service: {service.name}</Modal.Title>
      </Modal.Header>

      <Formik
        onSubmit={handleSave}
        initialValues={originalConfiguration}
        validationSchema={buildYup(schema, {})}
      >
        {({
          handleSubmit,
          handleChange,
          values,
          touched,
          isValid,
          isSubmitting,
          errors,
        }) => (
          <Form noValidate onSubmit={handleSubmit}>
            <Modal.Body>
              <Form.Group>
                <Form.Group controlId="label">
                  <Form.Label>Label</Form.Label>
                  <Form.Control
                    defaultValue={values.label}
                    onChange={handleChange}
                    isValid={touched.label && !errors.label}
                  />
                  <Form.Text className="text-muted">
                    A label to help identify this service
                  </Form.Text>
                </Form.Group>
              </Form.Group>
              <Form.Group>
                <Form.Label>Service</Form.Label>
                <Form.Control plaintext readOnly defaultValue={service.id} />
              </Form.Group>
              <Editor name="config" />
            </Modal.Body>
            <Modal.Footer>
              <div className="d-flex w-100">
                <div className="flex-grow-1">
                  <AsyncButton
                    variant="outline-danger"
                    onClick={() => onDelete(originalConfiguration.id)}
                  >
                    Delete
                  </AsyncButton>
                </div>
                {/* @ts-ignore: ts doesn't like the variant */}
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
          </Form>
        )}
      </Formik>
    </Modal>
  );
};

export default ServiceEditorModal;
