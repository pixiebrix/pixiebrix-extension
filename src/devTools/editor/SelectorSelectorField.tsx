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

import React, { useCallback, useContext, useMemo, useState } from "react";
import { useField } from "formik";
import { OptionsType } from "react-select";
import { compact, uniq } from "lodash";
import Creatable from "react-select/creatable";
import { Button } from "react-bootstrap";
import { faMousePointer } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { selectElement } from "@/background/devtools";
import { DevToolsContext } from "@/devTools/context";
import { SelectMode } from "@/nativeEditor/selector";

const SelectorSelectorField: React.FunctionComponent<{
  name: string;
  initialSuggestions: string[];
  selectMode?: SelectMode;
}> = ({ name, initialSuggestions, selectMode = "element" }) => {
  const { port } = useContext(DevToolsContext);

  const [field, , helpers] = useField(name);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [created, setCreated] = useState([]);
  const [isSelecting, setSelecting] = useState(false);

  const options: OptionsType<{ value: string }> = useMemo(() => {
    const all = uniq(compact([...suggestions, ...created, field.value]));
    return all.map((x) => ({ value: x, label: x }));
  }, [created, suggestions]);

  const select = useCallback(async () => {
    setSelecting(true);
    try {
      const selectors = await selectElement(port, { mode: selectMode });
      setSuggestions(selectors);
      helpers.setValue(selectors[0]);
    } finally {
      setSelecting(false);
    }
  }, [setSelecting]);

  return (
    <div className="d-flex">
      <div>
        <Button
          onClick={select}
          disabled={isSelecting}
          variant="info"
          aria-label="Select element"
        >
          <FontAwesomeIcon icon={faMousePointer} />
        </Button>
      </div>
      <div className="flex-grow-1">
        <Creatable
          isDisabled={isSelecting}
          options={options}
          onCreateOption={(inputValue) => {
            setCreated([...created, inputValue]);
            helpers.setValue(inputValue);
          }}
          value={options.find((x) => x.value === field.value)}
          onChange={(option) => helpers.setValue((option as any).value)}
        />
      </div>
    </div>
  );
};

export default SelectorSelectorField;
