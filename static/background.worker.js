// Don't include `background.worker.js` in webpack, there's no advantage in doing so

function get() {
  /*
	When scripts use DOM APIs, the worker will crash on load with the error
	`ReferenceError: window is not defined` without pointing to the correct line.
	This listener defines some globals so that they return `undefined` instead
	of throwing an error on access.

	This line also lets you add a breakpoint so that you can stop the debugger and
	see where the access originated from. Or temporarily add console.trace() here.
	*/
}

Object.defineProperties(self, {
  document: { get },
  window: { get },
  navigator: { get },
});

self.importScripts("./grayIconWhileLoading.js", "./background.js");
