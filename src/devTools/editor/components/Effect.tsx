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

import React, { useEffect, useState } from "react";
import { FormikValues } from "formik";
import { useDebounce } from "use-debounce";
import { isEqual } from "lodash";

/**
 * Component that calls a callback on render if `values` object has changed.
 * @deprecated You should think twice before using this component. If you are tyring to use it, it probably means
 *  your component hierarchy and state management is inefficient/bad.
 */
const Effect: React.FunctionComponent<{
  values: FormikValues;
  onChange: (values: FormikValues) => void;
  delayMillis: number;
}> = ({ values, onChange, delayMillis }) => {
  const [prev, setPrev] = useState(values);

  const [debounced] = useDebounce(values, delayMillis, {
    leading: true,
    trailing: true,
  });

  useEffect(
    () => {
      // Formik changing the reference, so can't use reference equality here
      if (!isEqual(prev, debounced)) {
        onChange(debounced);
        setPrev(debounced);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- leave off prev so it doesn't double-trigger the effect
    [setPrev, debounced, onChange]
  );

  // Don't render a react node
  return null;
};

export default Effect;
