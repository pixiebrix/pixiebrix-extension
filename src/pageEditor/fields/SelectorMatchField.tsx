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
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import widgetsRegistry from "@/components/fields/schemaFields/widgets/widgetsRegistry";

export type SelectorMatchFieldProps = {
  name: string;
  disabled?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
};

const defaultDescription = (
  <span>
    Selectors restricting when the extension runs. If provided, at least one of
    the selectors must match
    <i>on page load</i> for the extension to run.
  </span>
);

const SelectorMatchField: React.VFC<SelectorMatchFieldProps> = ({
  name,
  disabled,
  label = "Selectors",
  description = defaultDescription,
}) => (
  <ConnectedFieldTemplate
    name={name}
    as={widgetsRegistry.SelectorMatchWidget}
    disabled={disabled}
    label={label}
    description={description}
  />
);

export default SelectorMatchField;
