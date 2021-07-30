// Original code Copyright (c) 2010-2016 Andrew Bredow, John Michel, and other contributors
// https://github.com/johnmichel/Library-Detector-for-Chrome/blob/4c77e4e26197763ce87ea878be047c9c1d6f7017/content_scripts/lib_detect.js

// @ts-ignore
import libraryTests from "./libraries";
import { zip } from "lodash";

export interface Library {
  id: string;
  version: string | null;
}

type TestResult = { version: string | null } | false;

interface Test {
  id: string;
  test: (win: Window) => TestResult;
}

async function detectLibraries(): Promise<Library[]> {
  const detectedLibraries: Library[] = [];
  const tests = Object.values(libraryTests) as Test[];
  const results = await Promise.allSettled(
    tests.map(
      (test) => new Promise<TestResult>((resolve) => resolve(test.test(window)))
    )
  );
  for (const [definition, result] of zip(tests, results)) {
    if (result.status === "fulfilled") {
      if (result.value !== false) {
        detectedLibraries.push({
          id: definition.id,
          version: result.value.version,
        });
      }
    } else {
      console.warn(
        `Library Detector test for ${definition.id} failed: ${result.status}`
      );
    }
  }

  return detectedLibraries;
}

export default detectLibraries;
