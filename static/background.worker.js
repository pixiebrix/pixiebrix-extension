/*
eslint-disable import/no-unassigned-import --
Don't include `background.worker.js` in webpack, `backgroundCanary`
must be outside the main bundle in order to catch build errors
*/

import "./backgroundCanary.js";
import "./background.js";
