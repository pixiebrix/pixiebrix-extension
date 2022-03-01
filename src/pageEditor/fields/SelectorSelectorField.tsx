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

import React, { useMemo } from "react";
import { useField } from "formik";
import ComplexObjectValue from "@/components/fields/schemaFields/widgets/WorkshopMessageWidget";
import SelectorSelectorWidget, {
  SelectorSelectorProps,
} from "@/pageEditor/fields/SelectorSelectorWidget";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";

const SelectorSelectorField: React.FunctionComponent<
  SelectorSelectorProps & { name?: string }
> = (props) => {
  // Some properties (e.g., the menuItem's container prop) support providing an array of selectors.
  // See awaitElementOnce for for the difference in the semantics vs. nested CSS selectors
  const [field] = useField<string | string[]>(props.name);

  const isArray = Array.isArray(field.value);

  const Widget = useMemo(
    () => (isArray ? ComplexObjectValue : SelectorSelectorWidget),
    [isArray]
  );

  return <ConnectedFieldTemplate {...props} as={Widget} />;
};

export default SelectorSelectorField;
