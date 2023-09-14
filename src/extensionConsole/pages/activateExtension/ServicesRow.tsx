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

import styles from "@/extensionConsole/pages/activateRecipe/ServicesBody.module.scss";

import React from "react";
import { type AuthOption } from "@/auth/authTypes";
import { useField } from "formik";
import { type IntegrationDependency } from "@/types/integrationTypes";
import { PIXIEBRIX_INTEGRATION_ID } from "@/services/constants";
import { Card, Col, Row } from "react-bootstrap";
import ServiceDescriptor from "@/extensionConsole/pages/activateRecipe/ServiceDescriptor";
import AuthWidget from "@/components/auth/AuthWidget";
import FieldAnnotationAlert from "@/components/annotationAlert/FieldAnnotationAlert";
import { AnnotationType } from "@/types/annotationTypes";
import ServiceFieldError from "@/extensionConsole/components/ServiceFieldError";
import { useGetIntegrationsQuery } from "@/services/api";
import { joinName } from "@/utils/formUtils";

const ServicesRow: React.FunctionComponent<{
  authOptions: AuthOption[];
  refreshAuthOptions: () => void;
}> = ({ authOptions, refreshAuthOptions }) => {
  const [field, { error }] = useField<IntegrationDependency[]>(
    "integrationDependencies"
  );

  const { data: serviceConfigs } = useGetIntegrationsQuery();

  const values = field.value.map((dependency, index) => ({
    dependency,
    valueIndex: index,
  }));

  const configurable = values.filter(
    ({ dependency: { integrationId } }) =>
      integrationId !== PIXIEBRIX_INTEGRATION_ID
  );

  if (configurable.length === 0) {
    return null;
  }

  return (
    <Row>
      <Col xs={12}>
        <h4>Integrations</h4>
      </Col>
      {typeof error === "string" && (
        <FieldAnnotationAlert message={error} type={AnnotationType.Error} />
      )}
      {configurable.map(
        ({ dependency: { outputKey, integrationId }, valueIndex }) => (
          <Col xs={12} sm={6} xl={4} key={`${outputKey}-${valueIndex}`}>
            <ServiceFieldError servicesError={error} fieldIndex={valueIndex} />
            <Card className={styles.serviceCard}>
              <ServiceDescriptor
                serviceId={integrationId}
                serviceConfigs={serviceConfigs}
              />
              <AuthWidget
                authOptions={authOptions}
                integrationId={integrationId}
                name={joinName(field.name, String(valueIndex), "config")}
                onRefresh={refreshAuthOptions}
              />
            </Card>
          </Col>
        )
      )}
    </Row>
  );
};

export default ServicesRow;
