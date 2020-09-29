import mapValues from "lodash/mapValues";

export function boolean(value: unknown): boolean {
  if (typeof value === "string") {
    return ["true", "t", "yes", "y", "on", "1"].includes(
      value.trim().toLowerCase()
    );
  } else if (typeof value === "number") {
    return value !== 0;
  } else if (typeof value === "boolean") {
    return value;
  }
  return false;
}

export function clone<T extends {}>(object: T): T {
  return Object.assign(Object.create(null), object);
}

export function clearObject(obj: { [key: string]: unknown }): void {
  for (const member in obj) {
    if (obj.hasOwnProperty(member)) {
      delete obj[member];
    }
  }
}

export function castFunction(valueOrFunction: Function): Function;
export function castFunction(valueOrFunction: any): () => any {
  return typeof valueOrFunction === "function"
    ? valueOrFunction
    : () => valueOrFunction;
}

/**
 * Set values to undefined that can't be sent across the boundary between the host site context and the
 * content script context
 */
function cleanValue(value: unknown[]): unknown[];
function cleanValue(value: {
  [key: string]: unknown;
}): { [key: string]: unknown };
function cleanValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cleanValue);
  } else if (typeof value === "object") {
    return mapValues(value, cleanValue);
  } else if (typeof value === "function" || typeof value === "symbol") {
    return undefined;
  } else {
    return value;
  }
}

/**
 * Error indicating input elements to a block did not match the schema.
 */
export class InvalidPathError extends Error {
  public readonly path: string;
  readonly input: unknown;

  constructor(message: string, path: string) {
    super(message);
    this.name = "InvalidPathError";
    this.path = path;
  }
}

export function getPropByPath(
  obj: { [key: string]: any },
  path: string,
  { args = {} }: { args?: object } | undefined = {}
): unknown {
  // consider using jsonpath syntax https://www.npmjs.com/package/jsonpath

  let value: any = obj;
  const rawParts = path.trim().split(".");

  for (const [index, rawPart] of rawParts.entries()) {
    const previous = value;

    // handle null coalescing syntax
    let part: string | number = rawPart;
    let coalesce: boolean = false;
    let numeric: boolean = false;

    if (rawPart.endsWith("?")) {
      part = rawPart.slice(0, -1);
      coalesce = true;
    }

    if (part.match(/^\d+$/) && Array.isArray(value)) {
      part = parseInt(part, 0);
      numeric = true;
    }

    if (!(typeof value == "object" || (Array.isArray(previous) && numeric))) {
      throw new InvalidPathError(`Invalid path ${path}`, path);
    }

    value = value[part];

    // console.debug('getPropByPath:part', value);

    if (value == null) {
      if (coalesce || index === rawParts.length - 1) {
        return null;
      } else {
        throw new InvalidPathError(`${path} undefined (missing ${part})`, path);
      }
    }

    if (typeof value === "function") {
      try {
        value = value.apply(previous, args);
      } catch (exc) {
        throw new Error(`Error running method ${part}: ${exc}`);
      }
    }
  }

  return cleanValue(value);
}
