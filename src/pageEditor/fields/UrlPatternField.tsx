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
import { Shortcut } from "@/pageEditor/components/urlMatchPatternWidgetTypes";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import widgetsRegistry from "@/components/fields/schemaFields/widgets/widgetsRegistry";

export type UrlPatternFieldProps = {
  name: string;
  disabled?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  shortcuts?: Shortcut[];
};

const defaultDescription = (
  <span>
    URL pattern rules restricting when the extension runs. If provided, at least
    one of the rules must match for the extension to run. See{" "}
    <a
      href="https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API"
      target="_blank"
      rel="noreferrer"
    >
      URL Pattern API Documentation
    </a>{" "}
    for examples.
  </span>
);

const UrlPatternField: React.VFC<UrlPatternFieldProps> = ({
  name,
  disabled,
  label = "URL Patterns",
  description = defaultDescription,
}) => (
  <ConnectedFieldTemplate
    name={name}
    as={widgetsRegistry.UrlPatternWidget}
    disabled={disabled}
    label={label}
    description={description}
  />
);

export default UrlPatternField;
