/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

// eslint-disable-next-line no-restricted-imports -- All roads lead here
import EmotionShadowRoot from "react-shadow/emotion";
import { type CSSProperties } from "react";

/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion --
"Every property exists" (via Proxy), TypeScript doesn't offer such type
Also strictNullChecks config mismatch */
const ShadowRoot = EmotionShadowRoot.div!;

export const styleReset: CSSProperties = {
  all: "initial",
  font: "16px / 1.5 sans-serif",
};

export default ShadowRoot;
