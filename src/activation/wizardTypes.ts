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

import { type Primitive } from "type-fest";
import type React from "react";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { type IntegrationDependency } from "@/integrations/integrationTypes";

export type WizardStep = {
  key: string;
  label: string;
  Component: React.FunctionComponent<{
    mod: ModDefinition;
    reinstall: boolean;
  }>;
};

export type WizardValues = {
  /**
   * Mapping from mod component index to whether or not it's toggled.
   */
  modComponents: Record<string, boolean>;

  /**
   * Integration dependencies for the mod
   */
  integrationDependencies: IntegrationDependency[];

  // XXX: optionsArgs can contain periods, which will throw off formik
  optionsArgs: Record<string, Primitive>;
};
