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

export interface AuthenticationDefinition {
  headers?: { [key: string]: string };
  params?: { [key: string]: string };
}

export interface ServiceDefinition {
  metadata: Metadata;
  inputSchema: Schema;
  isAvailable?: {
    matchPatterns: string | string[];
  };
  authentication: AuthenticationDefinition;
}
