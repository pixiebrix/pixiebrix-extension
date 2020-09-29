export function globalSearch(startObject, value, returnFirstResult = false) {
  // adapted from: https://stackoverflow.com/a/12103127/402560
  if (startObject == null) {
    throw Error("startObject cannot be null");
  }

  const stack = [[startObject, ""]];
  const searched = [];
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

      for (const i of Object.keys(obj)) {
        stack.push([obj[i], address + prefix + i + postfix]);
      }

      searched.push(obj);
    }
  }
  return Array.from(found);
}
