// Original code Copyright (c) 2010-2016 Andrew Bredow, John Michel, and other contributors
// https://github.com/johnmichel/Library-Detector-for-Chrome/blob/4c77e4e26197763ce87ea878be047c9c1d6f7017/content_scripts/lib_detect.js

// @ts-ignore
import tests from "./libraries";
import { zip } from "lodash";

interface Library {
  id: string;
  version: string | null;
}

interface Test {
  id: string;
  test: (win: Window) => { version: string | null };
}

async function detectLibraries(): Promise<Library[]> {
  const libraries: Library[] = [];
  const testDefinitions = Object.values(tests) as Test[];
  const results = await Promise.allSettled(
    testDefinitions.map((x) => x.test(window))
  );
  for (const [definition, result] of zip(testDefinitions, results)) {
    if (result.status === "fulfilled") {
      libraries.push({
        id: definition.id,
        version: result.value.version,
      });
    } else {
      console.warn(`Library Detector test for ${definition.id} failed:`);
    }
  }
  return libraries;
}

export default detectLibraries;
