/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { Config, Metadata, RegistryId, Schema } from "@/core";
import { Permissions } from "webextension-polyfill-ts";
import { UiSchema } from "@rjsf/core";

export interface ExtensionPointConfig {
  /**
   * The id of the ExtensionPoint
   */
  id: RegistryId;

  label: string;

  /**
   * Additional permissions required by the configured extension. This section will generally be missing/blank unless
   * the permissions need to be declared to account for dynamic URLs accessed by the extension.
   */
  permissions?: Permissions.Permissions;

  services?: Record<string, string>;

  config: Config;
}

export interface OptionsDefinition {
  schema: Schema;
  uiSchema?: UiSchema;
}

type Kind = "recipe" | "service" | "reader" | "component";

/**
 * A PixieBrix brick or extension point definition
 */
export interface Definition {
  kind: Kind;
  metadata: Metadata;
}

export interface RecipeDefinition extends Definition {
  kind: "recipe";
  extensionPoints: ExtensionPointConfig[];
  options?: OptionsDefinition;
}

export interface KeyAuthenticationDefinition {
  baseURL?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

export interface TokenAuthenticationDefinition {
  baseURL?: string;
  token: {
    url: string;
    data: Record<string, unknown>;
  };
  headers: Record<string, string>;
}

export interface OAuth2AuthenticationDefinition {
  baseURL?: string;
  oauth2: {
    client_id: string;
    authorizeUrl: string;
    tokenUrl: string;
  };
  headers: Record<string, string>;
}

export interface ServiceDefinition<
  TAuth =
    | KeyAuthenticationDefinition
    | OAuth2AuthenticationDefinition
    | TokenAuthenticationDefinition
> {
  metadata: Metadata;
  inputSchema: Schema;
  isAvailable?: {
    matchPatterns: string | string[];
  };
  authentication: TAuth;
}
