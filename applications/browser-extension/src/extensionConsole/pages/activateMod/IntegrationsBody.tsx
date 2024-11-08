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

import styles from "./IntegrationsBody.module.scss";

import React, { useMemo } from "react";
import { Card } from "react-bootstrap";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import AuthWidget from "@/components/integrations/AuthWidget";
import IntegrationDescriptor from "./IntegrationDescriptor";
import { useField } from "formik";
import { useAuthOptions } from "@/hooks/useAuthOptions";
import { useGetIntegrationsQuery } from "@/data/service/api";
import ServiceFieldError from "../../components/ServiceFieldError";
import FieldAnnotationAlert from "../../../components/annotationAlert/FieldAnnotationAlert";
import { AnnotationType } from "@/types/annotationTypes";
import { isEmpty } from "lodash";
import { type RegistryId } from "@/types/registryTypes";
import { joinName } from "@/utils/formUtils";
import { type IntegrationDependency } from "@/integrations/integrationTypes";
import getModDefinitionIntegrationIds from "../../../integrations/util/getModDefinitionIntegrationIds";
import { freeze } from "@/utils/objectUtils";
import type { AuthOption } from "@/auth/authTypes";
import { fallbackValue } from "@/utils/asyncStateUtils";

const NO_AUTH_OPTIONS = freeze<AuthOption[]>([]);

interface OwnProps {
  mod: ModDefinition;
  hideBuiltInIntegrations?: boolean;
  showOwnTitle?: boolean;
}

type ValueField = {
  serviceId: RegistryId;
  index: number;
  isOptional?: boolean;
};

const IntegrationsBody: React.FunctionComponent<OwnProps> = ({
  mod,
  hideBuiltInIntegrations,
  showOwnTitle,
}) => {
  const { data: authOptions, refetch: refreshAuthOptions } = fallbackValue(
    useAuthOptions(),
    NO_AUTH_OPTIONS,
  );

  const [
    integrationDependenciesField,
    { error: integrationDependenciesFieldError },
  ] = useField<IntegrationDependency[]>("integrationDependencies");
  const { data: configs } = useGetIntegrationsQuery();

  const requiredIntegrationIds = useMemo(
    // The PixieBrix service gets automatically configured, so no need to include it
    () => getModDefinitionIntegrationIds(mod, { excludePixieBrix: true }),
    [mod],
  );

  function shouldShowField(integrationId: RegistryId): boolean {
    if (!requiredIntegrationIds.includes(integrationId)) {
      return false;
    }

    const configurationOptions = authOptions.filter(
      (option) => option.serviceId === integrationId,
    );

    // Always show field if there are no options available for the integration
    if (isEmpty(configurationOptions)) {
      return true;
    }

    if (hideBuiltInIntegrations) {
      // Show the field if there are options for the service that are not built-in
      return (
        authOptions.some(
          (option) =>
            option.serviceId === integrationId &&
            option.sharingType !== "built-in",
        ) ?? false
      );
    }

    return true;
  }

  const fieldsToShow: ValueField[] = integrationDependenciesField.value
    // We need to grab the index before filtering, because the index used
    // in the field name for AuthWidget needs to be consistent with the
    // index in field.value
    .map(({ integrationId: serviceId, isOptional }, index) => ({
      serviceId,
      index,
      isOptional,
    }))
    .filter(({ serviceId }) => shouldShowField(serviceId));

  return (
    <>
      {typeof integrationDependenciesFieldError === "string" && (
        <FieldAnnotationAlert
          message={integrationDependenciesFieldError}
          type={AnnotationType.Error}
        />
      )}
      {fieldsToShow.length > 0 && showOwnTitle && (
        <div className="mt-1">
          <h4>Integrations</h4>
        </div>
      )}
      {fieldsToShow.map(({ serviceId, index, isOptional }) => (
        <div key={serviceId}>
          <ServiceFieldError
            servicesError={integrationDependenciesFieldError}
            fieldIndex={index}
          />
          <Card className={styles.integrationCard}>
            <IntegrationDescriptor
              integrationId={serviceId}
              integrationConfigs={configs}
            />
            <AuthWidget
              authOptions={authOptions}
              integrationId={serviceId}
              isOptional={isOptional}
              name={joinName(
                integrationDependenciesField.name,
                String(index),
                "configId",
              )}
              onRefresh={refreshAuthOptions}
            />
          </Card>
        </div>
      ))}
    </>
  );
};

export default IntegrationsBody;
