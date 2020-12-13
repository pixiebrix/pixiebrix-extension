// Original code Copyright (c) 2010-2016 Andrew Bredow, John Michel, and other contributors
// https://github.com/johnmichel/Library-Detector-for-Chrome/blob/4c77e4e26197763ce87ea878be047c9c1d6f7017/content_scripts/lib_detect.js

// @ts-ignore
import tests from "./libraries";

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
  for (const { id, test } of Object.values(tests) as Test[]) {
    try {
      const result = await test(window);
      if (result) {
        libraries.push({
          id,
          version: result.version,
        });
      }
    } catch (e) {
      console.warn(`Library Detector test for ${id} failed:`);
    }
  }
  return libraries;
}

export default detectLibraries;
