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
import { type ServiceDependency } from "@/core";
import useFetch from "@/hooks/useFetch";
import { type ServiceDefinition } from "@/types/definitions";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import { Card, Col, Row } from "react-bootstrap";
import ServiceDescriptor from "@/extensionConsole/pages/activateRecipe/ServiceDescriptor";
import AuthWidget from "@/components/auth/AuthWidget";
import { joinName } from "@/utils";
import FieldAnnotationAlert from "@/components/annotationAlert/FieldAnnotationAlert";
import { AnnotationType } from "@/types";
import ServiceFieldError from "@/extensionConsole/components/ServiceFieldError";

const ServicesRow: React.FunctionComponent<{
  authOptions: AuthOption[];
  refreshAuthOptions: () => void;
}> = ({ authOptions, refreshAuthOptions }) => {
  const [field, { error }] = useField<ServiceDependency[]>("services");

  const { data: serviceConfigs } =
    useFetch<ServiceDefinition[]>("/api/services/");

  const values = field.value.map((dependency, index) => ({
    dependency,
    valueIndex: index,
  }));

  const configurable = values.filter(
    ({ dependency }) => dependency.id !== PIXIEBRIX_SERVICE_ID
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
      {configurable.map(({ dependency, valueIndex }) => (
        <Col
          xs={12}
          sm={6}
          xl={4}
          key={`${dependency.outputKey}-${valueIndex}`}
        >
          <ServiceFieldError servicesError={error} fieldIndex={valueIndex} />
          <Card className={styles.serviceCard}>
            <ServiceDescriptor
              serviceId={dependency.id}
              serviceConfigs={serviceConfigs}
            />
            <AuthWidget
              authOptions={authOptions}
              serviceId={dependency.id}
              name={joinName(field.name, String(valueIndex), "config")}
              onRefresh={refreshAuthOptions}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default ServicesRow;
