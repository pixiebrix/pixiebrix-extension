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

import { type IntegrationsState } from "@/integrations/store/integrationsSlice";
import { type IntegrationConfig } from "@/integrations/integrationTypes";
import { createSelector } from "@reduxjs/toolkit";

export const selectIntegrationConfigs = createSelector(
  (state: { integrations: IntegrationsState }) => state.integrations,
  (integrations) => Object.values(integrations.configured),
);

export const selectIntegrationConfigMap = ({
  integrations,
}: {
  integrations: IntegrationsState;
}): Record<string, IntegrationConfig> => integrations.configured;
