/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useMemo } from "react";
import blockRegistry from "@/blocks/registry";
import { PageTitle } from "@/layout/Page";
import cx from "classnames";
import { faEdit, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Nav from "react-bootstrap/Nav";
import ServicesFormCard from "@/options/pages/extensionEditor/ServicesFormCard";
import ExtensionConfigurationCard from "@/options/pages/extensionEditor/ExtensionConfigurationCard";
import { IExtensionPoint, ServiceDependency } from "@/core";
import DataSourceCard from "@/options/pages/extensionEditor/DataSourceCard";
import { Formik, FormikProps, getIn, useFormikContext } from "formik";
import TextField from "@/components/fields/TextField";
import ErrorBoundary from "@/components/ErrorBoundary";
import { extensionValidatorFactory } from "@/validators/validation";
import { SCHEMA_TYPE_TO_BLOCK_PROPERTY } from "@/components/fields/BlockField";
import castArray from "lodash/castArray";
import useAsyncEffect from "use-async-effect";
import isEmpty from "lodash/isEmpty";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "react-bootstrap/Button";
import RunLogCard from "@/options/pages/extensionEditor/RunLogCard";
import { useParams } from "react-router";
import { useDispatch } from "react-redux";
import { push as navigate } from "connected-react-router";
import { useAsyncState } from "@/hooks/common";

type TopConfig = { [prop: string]: unknown };

export interface Config {
  config: TopConfig;
  label: string;
  services: ServiceDependency[];
}

interface OwnProps {
  extensionPoint: IExtensionPoint;
  extensionId: string | null;
  initialValue: Config;
  onSave: (
    update: Config,
    helpers: { setSubmitting: (submitting: boolean) => void }
  ) => void;
}

const labelSchema = {
  description:
    "(Optional) A name for this attached brick so you can find it later.",
};

/**
 * Normalize the config to have the expected shape.
 * - Cast block $ref fields to arrays to they can support combinations.
 */
function normalizeConfig(
  config: TopConfig = {},
  extensionPoint: IExtensionPoint
): TopConfig {
  const schema = extensionPoint.inputSchema;
  const result: TopConfig = {};
  for (const [prop, definition] of Object.entries(schema.properties)) {
    if (typeof definition === "boolean") {
      throw Error("Expected schema definition not boolean");
    } else if (
      Object.prototype.hasOwnProperty.call(
        SCHEMA_TYPE_TO_BLOCK_PROPERTY,
        definition.$ref
      )
    ) {
      result[prop] = castArray(config[prop] ?? []);
    } else if (config[prop] == null) {
      result[prop] = extensionPoint.defaultOptions[prop] ?? schema.default;
    } else {
      result[prop] = config[prop];
    }
  }
  return result;
}

const NavItem: React.FunctionComponent<{
  caption: string;
  eventKey: string;
  fieldName?: string;
}> = ({ caption, eventKey, fieldName }) => {
  const formContext = useFormikContext();
  const isValid = !fieldName || isEmpty(getIn(formContext.errors, fieldName));

  return (
    <Nav.Item>
      <Nav.Link eventKey={eventKey} className={cx({ "text-danger": !isValid })}>
        {isValid ? (
          caption
        ) : (
          <span>
            <FontAwesomeIcon icon={faTimesCircle} /> {caption}
          </span>
        )}
      </Nav.Link>
    </Nav.Item>
  );
};

const ExtensionForm: React.FunctionComponent<{
  formikProps: FormikProps<unknown>;
  extensionPoint: IExtensionPoint;
  extensionId: string | null;
}> = ({
  formikProps: { handleSubmit, isSubmitting, isValid, validateForm },
  extensionPoint,
  extensionId,
}) => {
  const [blocks] = useAsyncState(blockRegistry.all(), []);

  const { tab: activeTab = "details" } = useParams<{ tab?: string }>();

  const dispatch = useDispatch();

  useAsyncEffect(async () => {
    await validateForm();
  }, [validateForm]);

  return (
    <Form noValidate onSubmit={handleSubmit}>
      <Row>
        <Col>
          <PageTitle icon={faEdit} title={`Edit: ${extensionPoint.name}`} />
        </Col>
        <Col className="text-right">
          <Button type="submit" disabled={isSubmitting || !isValid}>
            {extensionId ? "Update Brick" : "Activate Brick"}
          </Button>
        </Col>
      </Row>

      <Row>
        <Col>
          <div className="pb-4">
            <p>{extensionPoint.description}</p>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <Nav
                variant="tabs"
                defaultActiveKey={activeTab}
                onSelect={(tab: string) => {
                  const path = extensionId
                    ? `/workshop/extensions/${encodeURIComponent(
                        extensionId
                      )}/${tab}`
                    : `/workshop/install/${encodeURIComponent(
                        extensionPoint.id
                      )}/${tab}`;
                  dispatch(navigate(path));
                }}
              >
                <NavItem
                  caption="Details"
                  eventKey="details"
                  fieldName="label"
                />
                <NavItem
                  caption="Integrations"
                  eventKey="services"
                  fieldName="services"
                />
                <NavItem caption="Data" eventKey="reader" />
                <NavItem
                  caption="Configuration"
                  eventKey="configuration"
                  fieldName="config"
                />
                {extensionId && <NavItem caption="Log Stream" eventKey="log" />}
              </Nav>
            </Card.Header>

            {activeTab === "details" && (
              <Card.Body>
                <TextField label="Label" name="label" schema={labelSchema} />
                <Form.Group as={Row}>
                  <Form.Label column sm="2">
                    Foundation
                  </Form.Label>
                  <Col sm="10">
                    <Form.Control
                      plaintext
                      readOnly
                      value={extensionPoint.id}
                    />
                  </Col>
                </Form.Group>
              </Card.Body>
            )}
            {activeTab === "services" && <ServicesFormCard name="services" />}
            {activeTab === "reader" && (
              <ErrorBoundary>
                <DataSourceCard extensionPoint={extensionPoint} />
              </ErrorBoundary>
            )}
            {activeTab === "configuration" && (
              <ExtensionConfigurationCard
                name="config"
                extensionPoint={extensionPoint}
                blocks={blocks}
              />
            )}
            {extensionId && activeTab === "log" && (
              <RunLogCard
                extensionPointId={extensionPoint.id}
                extensionId={extensionId}
              />
            )}
          </Card>
        </Col>
      </Row>
    </Form>
  );
};

const ExtensionPointDetail: React.FunctionComponent<OwnProps> = ({
  extensionPoint,
  extensionId,
  onSave,
  initialValue: {
    config: initialConfig,
    label: initialLabel,
    services: initialServices,
  },
}) => {
  const initialValues = useMemo(
    () => ({
      label: initialLabel,
      services: initialServices ?? [],
      config: normalizeConfig(initialConfig, extensionPoint),
    }),
    [initialConfig, extensionPoint]
  );

  const validationSchema = useMemo(() => {
    return extensionValidatorFactory(extensionPoint.inputSchema);
  }, [extensionPoint]);

  return (
    <Formik
      onSubmit={onSave}
      validationSchema={validationSchema}
      initialValues={initialValues}
    >
      {(formikProps) => (
        <ExtensionForm
          formikProps={formikProps}
          extensionPoint={extensionPoint}
          extensionId={extensionId}
        />
      )}
    </Formik>
  );
};

export default ExtensionPointDetail;
