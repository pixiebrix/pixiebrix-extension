import { traceErrorFactory } from "@/tests/factories";
import applyTraceInputError from "./applyTraceInputError";
import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";

test("ignores non input errors", () => {
  const pipelineErrors: FormikErrorTree = {};
  const errorTraceEntry = traceErrorFactory();

  applyTraceInputError(pipelineErrors, errorTraceEntry, 0);

  expect(pipelineErrors).toEqual({});
});

test("figures required property error", () => {
  const pipelineErrors: FormikErrorTree = {};
  const property = "testProp";
  const traceError = {
    schema: {},
    errors: [
      {
        error: `Instance does not have required property "${property}".`,
      },
    ],
  };
  const errorTraceEntry = traceErrorFactory({
    error: traceError,
  });

  applyTraceInputError(pipelineErrors, errorTraceEntry, 0);

  // @ts-expect-error -- pipelineErrors[0] has 'config'
  expect(pipelineErrors[0].config[property]).toEqual(
    "Error from the last run: This field is required."
  );
});

test("sets unknown input error on the block level", () => {
  const pipelineErrors: FormikErrorTree = {};
  const errorMessage = "This is an unknown input validation error";
  const traceError = {
    schema: {},
    errors: [
      {
        error: errorMessage,
      },
    ],
  };
  const errorTraceEntry = traceErrorFactory({
    error: traceError,
  });

  applyTraceInputError(pipelineErrors, errorTraceEntry, 0);

  expect(pipelineErrors[0]).toEqual(errorMessage);
});
