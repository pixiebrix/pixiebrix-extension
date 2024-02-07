/*
eslint-disable import/no-unassigned-import --
Don't include `background.worker.js` in webpack, `grayIconWhileLoading`
must be outside the main bundle in order to catch build errors
*/

import "./grayIconWhileLoading.js";
import "./background.js";
