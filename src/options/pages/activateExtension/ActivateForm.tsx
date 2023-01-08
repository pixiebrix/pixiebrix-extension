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

import styles from "@/options/pages/marketplace/ActivateWizard.module.scss";

import React, { useCallback, useMemo } from "react";
import { type AuthOption } from "@/auth/authTypes";
import { type CloudExtension } from "@/types/contract";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Form, Formik, type FormikProps } from "formik";
import { useDispatch } from "react-redux";
import { push } from "connected-react-router";
import notify from "@/utils/notify";
import ServicesRow from "@/options/pages/activateExtension/ServicesRow";
import { type FormState } from "@/options/pages/activateExtension/activateTypes";
import PermissionsRow from "@/options/pages/activateExtension/PermissionsRow";
import extensionsSlice from "@/store/extensionsSlice";
import { type UUID } from "@/core";
import { Card, Col, Row } from "react-bootstrap";
import ActivateButton from "@/options/pages/activateExtension/ActivateButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCube } from "@fortawesome/free-solid-svg-icons";

const { actions } = extensionsSlice;

const ActivateHeader: React.FunctionComponent<{
  extension: CloudExtension;
}> = ({ extension }) => (
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
);

const ActivateForm: React.FunctionComponent<{
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
        notify.success("Activated extension");
        dispatch(push("/blueprints"));
      } catch (error) {
        notify.error({ message: "Error activating extension", error });
      } finally {
        helpers.setSubmitting(false);
      }
    },
    [extension, dispatch]
  );

  return (
    <Formik initialValues={initialValues} onSubmit={onSubmit}>
      {() => (
        <Form id="activate-wizard" noValidate>
          <Card>
            <ActivateHeader extension={extension} />
            <Card.Body>
              <ServicesRow
                authOptions={authOptions}
                refreshAuthOptions={refreshAuthOptions}
              />
              <PermissionsRow extension={extension} />
            </Card.Body>
          </Card>
        </Form>
      )}
    </Formik>
  );
};

export default ActivateForm;
