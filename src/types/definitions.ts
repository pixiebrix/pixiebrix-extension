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
