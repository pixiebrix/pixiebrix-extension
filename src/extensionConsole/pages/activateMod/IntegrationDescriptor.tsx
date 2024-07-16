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
import { type IntegrationDefinition } from "@/integrations/integrationTypes";
import { type RegistryId } from "@/types/registryTypes";

const IntegrationDescriptor: React.FunctionComponent<{
  integrationConfigs?: IntegrationDefinition[];
  integrationId: RegistryId;
}> = ({ integrationId, integrationConfigs }) => {
  const config = useMemo(
    () => integrationConfigs?.find((x) => x.metadata.id === integrationId),
    [integrationId, integrationConfigs],
  );

  return (
    <div className={styles.integrationCardHeader}>
      {config && (
        <h5 className={styles.integrationHeading}>{config.metadata.name}</h5>
      )}
      <code className={styles.integrationId}>{integrationId}</code>
    </div>
  );
};

export default IntegrationDescriptor;
