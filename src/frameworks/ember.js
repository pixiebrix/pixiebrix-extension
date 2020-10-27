/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import mapValues from "lodash/mapValues";

export function getVersion() {
  return window.Ember?.VERSION;
}

export function getEmberApplication() {
  // https://stackoverflow.com/questions/32971707/how-to-access-the-ember-data-store-from-the-console
  if (window.Ember) {
    const Ember = window.Ember;
    // https://github.com/emberjs/ember-inspector/blob/2237dc1b4818e31a856f3348f35305b10f42f60a/ember_debug/vendor/startup-wrapper.js#L201
    const namespaces = Ember.A(Ember.Namespace.NAMESPACES);
    return namespaces.filter(
      (namespace) => namespace instanceof Ember.Application
    )[0];
  } else {
    return undefined;
  }
}

export function getEmberComponentById(componentId) {
  const app = getEmberApplication();
  if (!app) {
    throw new Error("No Ember application found");
  }
  return app.__container__.lookup("-view-registry:main")[componentId];
}

export function readEmberValueFromCache(value) {
  if (value == null) {
    return value;
  } else if (typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "value")) {
      return readEmberValueFromCache(value.value);
    } else if (Object.prototype.hasOwnProperty.call(value, "_cache")) {
      return readEmberValueFromCache(value._cache);
    } else if (Array.isArray(value.content)) {
      return value.content.map(readEmberValueFromCache);
    } else {
      return mapValues(value, readEmberValueFromCache);
    }
  } else if (Array.isArray(value)) {
    return value.map(readEmberValueFromCache);
  } else if (typeof value === "function") {
    return undefined;
  } else {
    return value;
  }
}
