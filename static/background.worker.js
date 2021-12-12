// Chrome MV3 can only register one worker file, so we cannot register
// these files separately. Since this worker file is meant only for MV3 loads,
// it's easier to keep it static and out of the build anyway.

self.importScripts("./grayIconWhileLoading.js", "./background.js");
