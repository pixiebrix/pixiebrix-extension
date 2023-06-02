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
import { type RecipeDefinition } from "@/types/recipeTypes";
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

interface OwnProps {
  blueprint: RecipeDefinition;
  hideBuiltInServiceIntegrations?: boolean;
}

const emptyAuthOptions: readonly AuthOption[] = Object.freeze([]);

const ServicesBody: React.FunctionComponent<OwnProps> = ({
  blueprint,
  hideBuiltInServiceIntegrations,
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

  function shouldShowField({ id, config }: ServiceAuthPair): boolean {
    if (!requiredServiceIds.includes(id)) {
      return false;
    }

    if (hideBuiltInServiceIntegrations && !isEmpty(authOptions)) {
      // Show the field if there are options for the service that are not built-in
      return authOptions.some(
        (option) => option.serviceId === id && option.sharingType !== "built-in"
      );
    }

    return true;
  }

  return (
    <>
      {typeof error === "string" && (
        <FieldAnnotationAlert message={error} type={AnnotationType.Error} />
      )}
      {field.value.map(
        (serviceAuthPair, index) =>
          // Can't filter using `filter` because the index used in the field name for AuthWidget needs to be
          // consistent with the index in field.value
          shouldShowField(serviceAuthPair) && (
            <div key={serviceAuthPair.id}>
              <ServiceFieldError servicesError={error} fieldIndex={index} />
              <Card className={styles.serviceCard}>
                <ServiceDescriptor
                  serviceId={serviceAuthPair.id}
                  serviceConfigs={serviceConfigs}
                />
                <AuthWidget
                  authOptions={authOptions}
                  serviceId={serviceAuthPair.id}
                  name={joinName(field.name, String(index), "config")}
                  onRefresh={refreshAuthOptions}
                />
              </Card>
            </div>
          )
      )}
    </>
  );
};

export default ServicesBody;
