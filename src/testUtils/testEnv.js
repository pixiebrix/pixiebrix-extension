/*
 * Copyright (C) 2022 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// TODO: Drop after https://github.com/jsdom/jsdom/issues/2524
import { TextEncoder, TextDecoder } from "node:util";

// eslint-disable-next-line import/no-unassigned-import -- It's a polyfill
import "urlpattern-polyfill";

process.env.SERVICE_URL = "https://app.pixiebrix.com";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.PromiseRejectionEvent = class PromiseRejectionEvent extends Event {
  constructor(type, init) {
    super(type);
    this.promise = init.promise;
    this.reason = init.reason;
  }
};
