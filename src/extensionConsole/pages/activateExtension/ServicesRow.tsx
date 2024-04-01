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

import styles from "@/extensionConsole/pages/activateMod/IntegrationsBody.module.scss";

import React from "react";
import { type AuthOption } from "@/auth/authTypes";
import { useField } from "formik";
import { type IntegrationDependency } from "@/integrations/integrationTypes";
import { Card } from "react-bootstrap";
import IntegrationDescriptor from "@/extensionConsole/pages/activateMod/IntegrationDescriptor";
import AuthWidget from "@/components/integrations/AuthWidget";
import FieldAnnotationAlert from "@/components/annotationAlert/FieldAnnotationAlert";
import { AnnotationType } from "@/types/annotationTypes";
import ServiceFieldError from "@/extensionConsole/components/ServiceFieldError";
import { useGetIntegrationsQuery } from "@/data/service/api";
import { joinName } from "@/utils/formUtils";
import { PIXIEBRIX_INTEGRATION_ID } from "@/integrations/constants";

const ServicesRow: React.FunctionComponent<{
  authOptions: AuthOption[];
  refreshAuthOptions: () => void;
}> = ({ authOptions, refreshAuthOptions }) => {
  const [field, { error }] = useField<IntegrationDependency[]>(
    "integrationDependencies",
  );

  const { data: serviceConfigs } = useGetIntegrationsQuery();

  const values = field.value.map((dependency, index) => ({
    dependency,
    valueIndex: index,
  }));

  const configurable = values.filter(
    ({ dependency: { integrationId } }) =>
      integrationId !== PIXIEBRIX_INTEGRATION_ID,
  );

  if (configurable.length === 0) {
    return null;
  }

  return (
    <div>
      <h4>Integrations</h4>
      {typeof error === "string" && (
        <FieldAnnotationAlert message={error} type={AnnotationType.Error} />
      )}
      {configurable.map(({ dependency: { integrationId } }, valueIndex) => (
        // eslint-disable-next-line react/no-array-index-key -- They have no other unique identifier
        <div key={valueIndex} className="max-750">
          <ServiceFieldError servicesError={error} fieldIndex={valueIndex} />
          <Card className={styles.integrationCard}>
            <IntegrationDescriptor
              integrationId={integrationId}
              integrationConfigs={serviceConfigs}
            />
            <AuthWidget
              authOptions={authOptions}
              integrationId={integrationId}
              name={joinName(field.name, String(valueIndex), "configId")}
              onRefresh={refreshAuthOptions}
            />
          </Card>
        </div>
      ))}
    </div>
  );
};

export default ServicesRow;
