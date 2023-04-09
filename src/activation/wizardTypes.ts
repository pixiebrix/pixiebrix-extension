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

import { type Primitive } from "type-fest";
import type React from "react";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { type ServiceAuthPair } from "@/types/serviceTypes";

export type WizardStep = {
  key: string;
  label: string;
  Component: React.FunctionComponent<{
    blueprint: RecipeDefinition;
    reinstall: boolean;
  }>;
};

export type WizardValues = {
  /**
   * Mapping from extension index to whether or not it's toggled.
   */
  extensions: Record<string, boolean>;

  // Use array instead of Record<RegistryId, UUID> because `RegistryId`s can contain periods which throw off Formik
  /**
   * Mapping from service id to auth id.
   */
  services: ServiceAuthPair[];

  // XXX: optionsArgs can contain periods, which will throw off formik
  optionsArgs: Record<string, Primitive>;
};
