import nytimes from "@contrib/blocks/nytimes-org.yaml";
import trelloReader from "@contrib/readers/trello-card-reader.yaml";
import { ValidationError } from "@/errors";
import { fromJS } from "@/blocks/transformers/blockFactory";

test("two plus two is four", () => {
  expect(2 + 2).toBe(4);
});

test("can read yaml fixture", () => {
  expect(nytimes.kind).toBe("component");
});

test("can read yaml fixture", async () => {
  const block = await fromJS(nytimes);
  expect(block.id).toBe(
    "pixiebrix/examples-nytimes-articlesearch-organization-yaml"
  );
});

test("can read trello reader", async () => {
  const block = await fromJS(trelloReader);
  expect(block.id).toBe("pixiebrix/examples-trello-card-reader");
});

test("reject invalid fixture fixture", async () => {
  try {
    await fromJS({ foo: "bar" });
  } catch (ex) {
    expect(ex).toBeInstanceOf(ValidationError);
  }
});
