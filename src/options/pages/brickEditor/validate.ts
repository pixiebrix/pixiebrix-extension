import yaml from "js-yaml";
import { KIND_SCHEMAS, validateKind } from "@/validators/generic";
import { ValidationResult } from "@cfworker/json-schema";

export async function validateSchema(value: string): Promise<any> {
  if (!value) {
    return {
      config: "A definition is required",
    };
  }

  let json: any;
  try {
    json = yaml.safeLoad(value);
  } catch (ex) {
    return {
      config: [`Invalid YAML: ${ex}`],
    };
  }

  if (!KIND_SCHEMAS.hasOwnProperty(json.kind)) {
    return {
      config: [
        `Expected a value for "kind": ${Object.keys(KIND_SCHEMAS).join(", ")}`,
      ],
    };
  }

  let validation: ValidationResult;

  try {
    validation = await validateKind(json, json.kind);
  } catch (ex) {
    console.error(ex);
    return { config: ["An error occurred when validating the schema"] };
  }

  if (!validation.valid) {
    console.log("Validation results", validation.errors);
    return {
      config: validation.errors.map((x) => `${x.instanceLocation}: ${x.error}`),
    };
  } else {
    return {};
  }
}
