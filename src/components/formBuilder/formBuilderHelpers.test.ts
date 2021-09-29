import { replaceStringInArray } from "./formBuilderHelpers";

describe("replaceStringInArray", () => {
  let array: string[];
  beforeEach(() => {
    array = ["word1", "word2", "word3"];
  });

  test("does not mutate the source array", () => {
    const refToTheInitialArray = array;
    const copyOfInitialArray = [...array];
    replaceStringInArray(array, array[1]);
    expect(array).toBe(refToTheInitialArray);
    expect(array).toEqual(copyOfInitialArray);
  });

  test("can delete a string", () => {
    const expected = [array[0], array[2]];
    expect(replaceStringInArray(array, array[1])).toEqual(expected);
  });

  test("can replace a string", () => {
    const stringToInsert = "insert";
    const expected = [array[0], stringToInsert, array[2]];
    expect(replaceStringInArray(array, array[1], stringToInsert)).toEqual(
      expected
    );
  });

  test("returns the same array when string is not found", () => {
    expect(replaceStringInArray(array, "anotherWord1", "anotherWord2")).toEqual(
      array
    );
  });
});
