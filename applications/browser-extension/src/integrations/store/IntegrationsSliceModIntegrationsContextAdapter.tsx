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

import React, { type ReactNode } from "react";
import { useFormikContext } from "formik";
import { type IntegrationsFormSlice } from "../../components/fields/schemaFields/integrations/integrationDependencyFieldUtils";
import ModIntegrationsContext, {
  type ModIntegrationsContextValue,
} from "../../mods/ModIntegrationsContext";

const IntegrationsSliceModIntegrationsContextAdapter: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const { values } = useFormikContext<IntegrationsFormSlice>();

  const contextValue: ModIntegrationsContextValue = {
    integrationDependencies: values.integrationDependencies ?? [],
  };

  return (
    <ModIntegrationsContext.Provider value={contextValue}>
      {children}
    </ModIntegrationsContext.Provider>
  );
};

export default IntegrationsSliceModIntegrationsContextAdapter;
