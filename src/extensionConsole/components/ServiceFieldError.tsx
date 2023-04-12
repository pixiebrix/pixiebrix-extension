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

import React from "react";
import { isEmpty } from "lodash";
import FieldAnnotationAlert from "@/components/annotationAlert/FieldAnnotationAlert";
import { AnnotationType } from "@/types/annotationTypes";

const ServiceFieldError: React.FC<{
  servicesError: string | Array<string | Record<string, string>> | undefined;
  fieldIndex: number;
}> = ({ servicesError, fieldIndex }) => {
  if (!Array.isArray(servicesError)) {
    return null;
  }

  // eslint-disable-next-line security/detect-object-injection -- index
  const fieldError = servicesError[fieldIndex];

  let errorMessage: string = null;

  if (typeof fieldError === "string") {
    errorMessage = fieldError;
  }

  if (
    typeof fieldError === "object" &&
    "config" in fieldError &&
    typeof fieldError.config === "string"
  ) {
    errorMessage = fieldError.config;
  }

  if (isEmpty(errorMessage)) {
    return null;
  }

  return (
    <FieldAnnotationAlert message={errorMessage} type={AnnotationType.Error} />
  );
};

export default ServiceFieldError;
