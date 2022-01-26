/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { SanitizedServiceConfiguration, Schema } from "@/core";
import useDependency from "@/services/useDependency";
import ServiceField from "@/components/fields/schemaFields/ServiceField";
import { Button } from "react-bootstrap";
import { extractServiceIds } from "@/services/serviceUtils";

type ConfigProps = {
  serviceSchema: Schema;
  serviceFieldName: string;
  message?: React.ReactNode;
  children: (childProps: {
    config: SanitizedServiceConfiguration;
  }) => React.ReactNode;
};

const defaultMessage = (
  <p>
    You must grant permissions for your browser to send information to the
    integration
  </p>
);

/**
 * HOC for options that require a configured service (e.g., because they fetch their options from that service.
 */
const RequireServiceConfig: React.FC<ConfigProps> = ({
  serviceSchema,
  serviceFieldName,
  message = defaultMessage,
  children,
}) => {
  const serviceIds = extractServiceIds(serviceSchema);

  const { hasPermissions, requestPermissions, config } = useDependency(
    serviceIds
  );

  const serviceField = (
    <ServiceField
      label="Integration"
      name={serviceFieldName}
      schema={serviceSchema}
    />
  );

  if (!config) {
    return <div>{serviceField}</div>;
  }

  if (!hasPermissions) {
    return (
      <div>
        {serviceField}

        {message}
        <Button onClick={requestPermissions}>Grant Permissions</Button>
      </div>
    );
  }

  return (
    <div>
      {serviceField}
      {children({ config })}
    </div>
  );
};

export default RequireServiceConfig;
