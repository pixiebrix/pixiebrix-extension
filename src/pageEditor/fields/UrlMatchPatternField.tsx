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

import React from "react";
import UrlMatchPatternWidget, {
  Shortcut,
} from "@/pageEditor/components/UrlMatchPatternWidget";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";

export type UrlMatchPatternFieldProps = {
  name: string;
  disabled?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  shortcuts?: Shortcut[];
};

const defaultDescription = (
  <span>
    URL match pattern for which pages to run the extension on. See{" "}
    <a
      href="https://developer.chrome.com/docs/extensions/mv2/match_patterns/"
      target="_blank"
      rel="noreferrer"
    >
      Patterns Documentation
    </a>{" "}
    for examples
  </span>
);

const UrlMatchPatternField: React.VFC<UrlMatchPatternFieldProps> = ({
  name,
  disabled,
  label = "Sites",
  description = defaultDescription,
  shortcuts,
}) => (
  <ConnectedFieldTemplate
    name={name}
    as={UrlMatchPatternWidget}
    disabled={disabled}
    label={label}
    description={description}
    shortcuts={shortcuts}
  />
);

export default UrlMatchPatternField;
