import { validateKind } from "@/validators/generic";
import yaml from "js-yaml";

// @ts-ignore: jest has a transformer for text files
import serviceTemplate from "@contrib/templates/service.txt";

test("can validate service", async () => {
  const json = yaml.safeLoad(serviceTemplate) as object;
  const result = await validateKind(json, "service");
  console.log(result.errors);
  expect(result.valid).toBeTruthy();
});
