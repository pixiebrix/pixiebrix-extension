import { Schema } from "@/core";

export function fieldLabel(name: string): string {
  const parts = name.split(".");
  return parts[parts.length - 1];
}

export function makeInitialValues(
  values: { [key: string]: unknown },
  schema: Schema
) {
  return values;
}
