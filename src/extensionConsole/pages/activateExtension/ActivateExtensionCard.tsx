/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import styles from "@/extensionConsole/pages/activateRecipe/ActivateRecipeCard.module.scss";

import React, { useCallback, useMemo } from "react";
import { type AuthOption } from "@/auth/authTypes";
import { type CloudExtension } from "@/types/contract";
import { type FormikProps, useFormikContext } from "formik";
import { useDispatch } from "react-redux";
import { push } from "connected-react-router";
import notify from "@/utils/notify";
import ServicesRow from "@/extensionConsole/pages/activateExtension/ServicesRow";
import { type FormState } from "@/extensionConsole/pages/activateExtension/activateTypes";
import PermissionsRow from "@/extensionConsole/pages/activateExtension/PermissionsRow";
import extensionsSlice from "@/store/extensionsSlice";
import { type UUID } from "@/types/stringTypes";
import { Card, Col, Row } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCube, faMagic } from "@fortawesome/free-solid-svg-icons";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import AsyncButton from "@/components/AsyncButton";
import Form, { type RenderBody } from "@/components/form/Form";
import { object } from "yup";
import * as Yup from "yup";

const { actions } = extensionsSlice;

const ActivateButton: React.FunctionComponent = () => {
  const { submitForm, values, isSubmitting } = useFormikContext<FormState>();

  const anyUnconfigured = values.services.some(
    ({ id, config }) => id !== PIXIEBRIX_SERVICE_ID && config == null
  );

  return (
    <AsyncButton
      variant="primary"
      onClick={submitForm}
      disabled={anyUnconfigured || isSubmitting}
    >
      <FontAwesomeIcon icon={faMagic} /> Activate
    </AsyncButton>
  );
};

const validationSchema = object().shape({
  services: Yup.array().of(
    Yup.object().test(
      "servicesRequired",
      "Please select a configuration",
      (value) => value.id === PIXIEBRIX_SERVICE_ID || value.config != null
    )
  ),
});

const ActivateExtensionCard: React.FunctionComponent<{
  extension: CloudExtension;
  authOptions: AuthOption[];
  refreshAuthOptions: () => void;
}> = ({ extension, authOptions, refreshAuthOptions }) => {
  const dispatch = useDispatch();

  const initialValues: FormState = useMemo(() => {
    const uuids = new Set<UUID>(authOptions.map((x) => x.value));
    return {
      services: extension.services.map((service) => ({
        ...service,
        config: uuids.has(service.config) ? service.config : null,
      })),
    };
  }, [authOptions, extension]);

  const onSubmit = useCallback(
    async (values: FormState, helpers: FormikProps<FormState>) => {
      try {
        dispatch(
          actions.installCloudExtension({
            extension: { ...extension, ...values },
          })
        );
        notify.success("Activated mod");
        dispatch(push("/mods"));
      } catch (error) {
        notify.error({ message: "Error activating mod", error });
      } finally {
        helpers.setSubmitting(false);
      }
    },
    [extension, dispatch]
  );

  const renderBody: RenderBody = () => (
    <Card>
      <Card.Header className={styles.wizardHeader}>
        <Row>
          <Col>
            <div className={styles.wizardHeaderLayout}>
              <div className={styles.wizardMainInfo}>
                <span className={styles.blueprintIcon}>
                  <FontAwesomeIcon icon={faCube} />
                </span>
                <Card.Title>{extension.label}</Card.Title>
              </div>
              <div className={styles.wizardDescription}>
                Created in the Page Editor
              </div>
            </div>
            <div className={styles.activateButtonContainer}>
              <ActivateButton />
            </div>
          </Col>
        </Row>
      </Card.Header>
      <Card.Body>
        <ServicesRow
          authOptions={authOptions}
          refreshAuthOptions={refreshAuthOptions}
        />
        <PermissionsRow extension={extension} />
      </Card.Body>
    </Card>
  );

  return (
    <Form
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
      renderBody={renderBody}
      renderSubmit={() => null}
    />
  );
};

export default ActivateExtensionCard;
