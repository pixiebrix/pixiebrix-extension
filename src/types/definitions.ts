/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Metadata, Schema } from "@/core";

export interface ExtensionPointDefinition {
  id: string;
  label: string;
  services?: { [key: string]: string };
}

export interface RecipeDefinition {
  metadata: Metadata;
  extensionPoints: ExtensionPointDefinition[];
}

export interface KeyAuthenticationDefinition {
  headers?: { [header: string]: string };
  params?: { [param: string]: string };
}

export interface OAuth2AuthenticationDefinition {
  baseURL?: string;
  oauth2: { client_id: string; host: string };
  headers: { [header: string]: string };
}

export interface ServiceDefinition<
  TAuth = KeyAuthenticationDefinition | OAuth2AuthenticationDefinition
> {
  metadata: Metadata;
  inputSchema: Schema;
  isAvailable?: {
    matchPatterns: string | string[];
  };
  authentication: TAuth;
}
