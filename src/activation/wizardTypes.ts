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

import type React from "react";
import type { ModDefinition } from "@/types/modDefinitionTypes";
import type { IntegrationDependency } from "@/integrations/integrationTypes";
import type { OptionsArgs } from "@/types/runtimeTypes";

export type WizardStep = {
  key: string;
  label: string;
  Component: React.FunctionComponent<{
    mod: ModDefinition;
  }>;
};

export type ActivationWizardValues = {
  /**
   * Integration dependencies for the mod
   */
  integrationDependencies: IntegrationDependency[];

  // XXX: optionsArgs keys (options names) can contain periods, which will throw off formik
  optionsArgs: OptionsArgs;

  /**
   * Whether to set up a personal deployment with the mod
   * @since 2.1.2
   */
  personalDeployment?: boolean;
};
