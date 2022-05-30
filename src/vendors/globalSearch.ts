export function globalSearch(
  startObject: object,
  value: unknown,
  returnFirstResult = false
): unknown[] {
  // Adapted from: https://stackoverflow.com/a/12103127/402560
  if (startObject == null) {
    throw Error("startObject cannot be null");
  }

  const stack = [[startObject, ""]];
  const searched: unknown[] = [];
  const found = [];

  while (stack.length) {
    const fromStack = stack.pop();
    const [obj, address] = fromStack;

    if (obj == null) {
      continue;
    }

    if (typeof obj === typeof value && obj === value) {
      if (returnFirstResult) {
        return [{ path: address, value }];
      }

      found.push({ path: address, value });
    }

    if (typeof obj === "object" && !searched.includes(obj)) {
      let prefix;
      let postfix;

      if (Array.isArray(obj)) {
        prefix = "[";
        postfix = "]";
      } else {
        prefix = ".";
        postfix = "";
      }

      for (const [value, key] of Object.entries(obj)) {
        stack.push([value, address + prefix + key + postfix]);
      }

      searched.push(obj);
    }
  }

  return Array.from(found);
}
