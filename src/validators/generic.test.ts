import { validateKind } from "@/validators/generic";

const serviceTemplate = require("raw-loader!@contrib/templates/service.txt?esModule=false")
  .default;

test("can validate service", async () => {
  expect((await validateKind(serviceTemplate, "service")).valid).toBeTruthy();
});
