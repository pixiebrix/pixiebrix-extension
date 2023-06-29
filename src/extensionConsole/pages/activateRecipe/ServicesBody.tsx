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

import styles from "./ServicesBody.module.scss";

import React, { useMemo } from "react";
import { Card } from "react-bootstrap";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import AuthWidget from "@/components/auth/AuthWidget";
import ServiceDescriptor from "@/extensionConsole/pages/activateRecipe/ServiceDescriptor";
import { useField } from "formik";
import { type ServiceAuthPair } from "@/types/serviceTypes";
import { useAuthOptions } from "@/hooks/auth";
import { useGetServicesQuery } from "@/services/api";
import { joinName } from "@/utils";
import ServiceFieldError from "@/extensionConsole/components/ServiceFieldError";
import FieldAnnotationAlert from "@/components/annotationAlert/FieldAnnotationAlert";
import { AnnotationType } from "@/types/annotationTypes";
import { getRequiredServiceIds } from "@/utils/recipeUtils";
import { fallbackValue } from "@/utils/asyncStateUtils";
import { type AuthOption } from "@/auth/authTypes";
import { isEmpty } from "lodash";
import { type RegistryId } from "@/types/registryTypes";

interface OwnProps {
  blueprint: ModDefinition;
  hideBuiltInServiceIntegrations?: boolean;
  showOwnTitle?: boolean;
}

type ValueField = {
  serviceId: RegistryId;
  index: number;
};

const emptyAuthOptions: readonly AuthOption[] = Object.freeze([]);

const ServicesBody: React.FunctionComponent<OwnProps> = ({
  blueprint,
  hideBuiltInServiceIntegrations,
  showOwnTitle,
}) => {
  const { data: authOptions, refetch: refreshAuthOptions } = fallbackValue(
    useAuthOptions(),
    emptyAuthOptions
  );
  const [field, { error }] = useField<ServiceAuthPair[]>("services");
  const { data: serviceConfigs } = useGetServicesQuery();

  const requiredServiceIds = useMemo(
    () => getRequiredServiceIds(blueprint),
    [blueprint]
  );

  function shouldShowField(serviceId: RegistryId): boolean {
    if (!requiredServiceIds.includes(serviceId)) {
      return false;
    }

    const serviceOptions = authOptions.filter(
      (option) => option.serviceId === serviceId
    );

    // Always show field if there are no options available for the service
    if (isEmpty(serviceOptions)) {
      return true;
    }

    if (hideBuiltInServiceIntegrations) {
      // Show the field if there are options for the service that are not built-in
      return authOptions.some(
        (option) =>
          option.serviceId === serviceId && option.sharingType !== "built-in"
      );
    }

    return true;
  }

  const fieldsToShow: ValueField[] = field.value
    // We need to grab the index before filtering, because the index used
    // in the field name for AuthWidget needs to be consistent with the
    // index in field.value
    .map(({ id: serviceId }, index) => ({ serviceId, index }))
    .filter(({ serviceId }) => shouldShowField(serviceId));

  return (
    <>
      {typeof error === "string" && (
        <FieldAnnotationAlert message={error} type={AnnotationType.Error} />
      )}
      {fieldsToShow.length > 0 && showOwnTitle && (
        <div className="mt-1">
          <h4>Integrations</h4>
        </div>
      )}
      {fieldsToShow.map(({ serviceId, index }) => (
        <div key={serviceId}>
          <ServiceFieldError servicesError={error} fieldIndex={index} />
          <Card className={styles.serviceCard}>
            <ServiceDescriptor
              serviceId={serviceId}
              serviceConfigs={serviceConfigs}
            />
            <AuthWidget
              authOptions={authOptions}
              serviceId={serviceId}
              name={joinName(field.name, String(index), "config")}
              onRefresh={refreshAuthOptions}
            />
          </Card>
        </div>
      ))}
    </>
  );
};

export default ServicesBody;
