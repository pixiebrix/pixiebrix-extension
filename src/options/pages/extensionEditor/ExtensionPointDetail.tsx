/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import blockRegistry from "@/blocks/registry";
import { PageTitle } from "@/layout/Page";
import cx from "classnames";
import {
  faDownload,
  faEdit,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import { Form, Row, Col, Card, Nav, Button } from "react-bootstrap";
import ServicesFormCard from "@/options/pages/extensionEditor/ServicesFormCard";
import ExtensionConfigurationCard from "@/options/pages/extensionEditor/ExtensionConfigurationCard";
import { IExtensionPoint, OptionsArgs, ServiceDependency } from "@/core";
import DataSourceCard from "@/options/pages/extensionEditor/DataSourceCard";
import { Formik, FormikProps, getIn, useFormikContext } from "formik";
import TextField from "@/components/fields/TextField";
import ErrorBoundary from "@/components/ErrorBoundary";
import { extensionValidatorFactory } from "@/validators/validation";
import { SCHEMA_TYPE_TO_BLOCK_PROPERTY } from "@/components/fields/BlockField";
import { castArray, isEmpty, fromPairs, truncate } from "lodash";
import useAsyncEffect from "use-async-effect";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import RunLogCard from "@/options/pages/extensionEditor/RunLogCard";
import { useParams } from "react-router";
import { useDispatch } from "react-redux";
import { push as navigate } from "connected-react-router";
import { useAsyncState } from "@/hooks/common";
import { saveAs } from "file-saver";
import { useToasts } from "react-toast-notifications";
import { reportError } from "@/telemetry/logging";
import { configToYaml } from "@/devTools/editor/hooks/useCreate";
import OptionsArgsCard from "@/options/pages/extensionEditor/OptionsArgsCard";
import { useTitle } from "@/hooks/title";
import { HotKeys } from "react-hotkeys";

type TopConfig = { [prop: string]: unknown };

export interface Config {
  config: TopConfig;
  label: string;
  services: ServiceDependency[];
  optionsArgs: OptionsArgs;
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
    // Safe because prop is coming from Object.entries
    /* eslint-disable security/detect-object-injection */
    if (typeof definition === "boolean") {
      throw new TypeError("Expected schema definition not boolean");
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
    /* eslint-enable security/detect-object-injection */
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

function exportBlueprint(
  { label, services, config }: Config,
  extensionPoint: IExtensionPoint
): void {
  const blueprint = {
    apiVersion: "v1",
    kind: "recipe",
    metadata: {
      // In the future, could put in the user's scope here? Wouldn't be a valid id though
      id: "",
      name: label,
      description: "Blueprint exported from PixieBrix",
      version: "1.0.0",
    },
    extensionPoints: [
      {
        id: extensionPoint.id,
        label,
        services: fromPairs(
          services
            .filter((x) => x.outputKey != null)
            .map(({ outputKey, id }) => [outputKey, id])
        ),
        config,
      },
    ],
  };
  const blueprintYAML = configToYaml(blueprint);
  const blob = new Blob([blueprintYAML], { type: "text/plain;charset=utf-8" });
  saveAs(blob, "blueprint.yaml");
}

const ExtensionForm: React.FunctionComponent<{
  formikProps: FormikProps<Config>;
  extensionPoint: IExtensionPoint;
  extensionId: string | null;
}> = ({
  formikProps: { handleSubmit, isSubmitting, isValid, validateForm, values },
  extensionPoint,
  extensionId,
}) => {
  useTitle(
    `Configure ${truncate(!isEmpty(values.label) ? values.label : "Brick", {
      length: 15,
    })}`
  );

  const [blocks] = useAsyncState(blockRegistry.all(), []);

  const { tab: activeTab = "details" } = useParams<{ tab?: string }>();

  const dispatch = useDispatch();

  const { addToast } = useToasts();

  useAsyncEffect(async () => {
    await validateForm();
  }, [validateForm]);

  const handleExport = useCallback(() => {
    try {
      exportBlueprint(values, extensionPoint);
    } catch (error: unknown) {
      reportError(error);
      addToast(`Error exporting as blueprint: ${error}`, {
        appearance: "error",
        autoDismiss: true,
      });
    }
  }, [addToast, values, extensionPoint]);

  const hasOptions = !isEmpty(values.optionsArgs);

  return (
    <Form noValidate onSubmit={handleSubmit}>
      <Row>
        <Col>
          <PageTitle icon={faEdit} title={`Edit: ${extensionPoint.name}`} />
        </Col>
        <Col className="text-right">
          <Button variant="info" onClick={handleExport}>
            <FontAwesomeIcon icon={faDownload} /> Export Blueprint
          </Button>
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
                {hasOptions && <NavItem caption="Options" eventKey="options" />}
                <NavItem caption="Data" eventKey="reader" />
                <NavItem
                  caption="Configuration"
                  eventKey="configuration"
                  fieldName="config"
                />
                {extensionId && <NavItem caption="Logs" eventKey="log" />}
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
            {activeTab === "options" && <OptionsArgsCard name="optionsArgs" />}
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

const keyMap = {
  SAVE: "command+s",
};

const ExtensionPointDetail: React.FunctionComponent<OwnProps> = ({
  extensionPoint,
  extensionId,
  onSave,
  initialValue: {
    config: initialConfig,
    label: initialLabel,
    services: initialServices,
    optionsArgs: initialOptionsArgs,
  },
}) => {
  const initialValues = useMemo(
    () => ({
      label: initialLabel,
      services: initialServices ?? [],
      config: normalizeConfig(initialConfig, extensionPoint),
      optionsArgs: initialOptionsArgs,
    }),
    [
      initialOptionsArgs,
      initialLabel,
      initialServices,
      initialConfig,
      extensionPoint,
    ]
  );

  const validationSchema = useMemo(
    () => extensionValidatorFactory(extensionPoint.inputSchema),
    [extensionPoint]
  );

  return (
    <HotKeys keyMap={keyMap}>
      <Formik
        onSubmit={onSave}
        validationSchema={validationSchema}
        initialValues={initialValues}
      >
        {(formikProps) => (
          <HotKeys
            handlers={{
              SAVE: (keyEvent) => {
                keyEvent.preventDefault();
                formikProps.handleSubmit();
              },
            }}
          >
            <ExtensionForm
              formikProps={formikProps}
              extensionPoint={extensionPoint}
              extensionId={extensionId}
            />
          </HotKeys>
        )}
      </Formik>
    </HotKeys>
  );
};

export default ExtensionPointDetail;
