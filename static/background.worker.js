// Don't include `background.worker.js` in webpack, there's no advantage in doing so

if (chrome.runtime.getManifest === undefined) {
  throw new Error(
    "Chrome bug: The extension was loaded as MV2, but Chrome is still running the worker. Unregister the loader from chrome://serviceworker-internals/",
  );
}

function get() {
  /*
	When scripts use DOM APIs, the worker will crash on load with the error
	`ReferenceError: window is not defined` without pointing to the correct line.
	This listener defines some globals so that they return `undefined` instead
	of throwing an error on access.
	*/

  // Debug helpers: trace or breakable line

  // There are a lot of safe `window` checks in the code so the logger cannot be enabled by default.
  // console.trace('DOM access in worker');

  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  1; // This line lets you add a breakpoint so that you can stop the debugger
}

Object.defineProperties(self, {
  document: { get },
  window: { get },
});

self.importScripts("./grayIconWhileLoading.js", "./background.js");
