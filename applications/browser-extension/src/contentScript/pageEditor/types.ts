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

import {
  type StarterBrickDefinitionLike,
  type StarterBrickDefinitionProp,
} from "../../starterBricks/types";
import { type StarterBrickType } from "../../types/starterBrickTypes";
import { type Except } from "type-fest";
import {
  type ButtonDefinition,
  type ButtonStarterBrickConfig,
} from "../../starterBricks/button/buttonStarterBrickTypes";
import { type ElementInfo } from "../../utils/inference/selectorTypes";
import { type ModComponentBase } from "../../types/modComponentTypes";
import { type UUID } from "../../types/stringTypes";
import { type ApiVersion, type BrickArgsContext } from "../../types/runtimeTypes";
import { type BrickConfig } from "../../bricks/types";

export interface DraftModComponent<
  TStarterBrickDefinitionProp extends
    StarterBrickDefinitionProp = StarterBrickDefinitionProp,
  TModComponentConfig extends UnknownObject = UnknownObject,
> {
  type: StarterBrickType;
  starterBrickDefinition: StarterBrickDefinitionLike<TStarterBrickDefinitionProp>;
  modComponent: ModComponentBase<TModComponentConfig>;
}

export type SelectMode = "element" | "container";
export type DraftButtonModComponent = DraftModComponent<
  ButtonDefinition,
  ButtonStarterBrickConfig
>;
export type ButtonSelectionResult = {
  uuid: UUID;
  menu: Except<ButtonDefinition, "defaultOptions" | "isAvailable" | "reader">;
  item: Pick<ButtonStarterBrickConfig, "caption">;
  containerInfo: ElementInfo;
};

export type AttributeExample = {
  name: string;
  value: string;
};

export type RunBrickArgs = {
  /**
   * The runtime API version to use
   */
  apiVersion: ApiVersion;
  /**
   * The Brick configuration.
   */
  brickConfig: BrickConfig;
  /**
   * Context to render the BlockArg, should include @input, @options, and integrations context
   * @see IntegrationsContext
   * @see makeIntegrationsContextFromDependencies
   */
  context: BrickArgsContext;
  /**
   * Root jQuery selector to determine the root if the rootMode is "inherit".
   * @see BrickConfig.rootMode
   */
  rootSelector: string | undefined;
};
