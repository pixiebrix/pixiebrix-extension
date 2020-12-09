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

import React, {
  ComponentType,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useField } from "formik";
import { OptionsType } from "react-select";
import { uniq } from "lodash";
import Creatable from "react-select/creatable";
import { components } from "react-select";
import { Badge, Button } from "react-bootstrap";
import { faMousePointer } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { selectElement } from "@/background/devtools";
import { DevToolsContext } from "@/devTools/context";
import { ElementInfo, SelectMode } from "@/nativeEditor/selector";
import { OptionProps } from "react-select/src/components/Option";
import * as nativeOperations from "@/background/devtools";
import { Framework } from "@/messaging/constants";

type OptionValue = { value: string; elementInfo?: ElementInfo };
type SelectorOptions = OptionsType<OptionValue>;

const CustomOption: ComponentType<OptionProps<OptionValue>> = ({
  children,
  ...props
}) => {
  const { port } = useContext(DevToolsContext);

  const toggle = useCallback(
    async (on: boolean) => {
      await nativeOperations.toggleSelector(port, {
        selector: props.data.value,
        on,
      });
    },
    [port, props.data.value]
  );

  return (
    <components.Option {...props}>
      <div onMouseEnter={() => toggle(true)} onMouseLeave={() => toggle(false)}>
        {props.data.elementInfo && (
          <Badge variant="info">{props.data.elementInfo.tagName}</Badge>
        )}
        {props.data.framework && (
          <Badge variant="info">{props.data.framework}</Badge>
        )}
        {children}
      </div>
    </components.Option>
  );
};

function makeOptions(
  elementInfo: ElementInfo | null,
  extra: string[]
): SelectorOptions {
  if (!elementInfo) {
    return uniq(extra).map((x) => ({ value: x, label: x }));
  }
  const options = elementInfo.selectors.map((x) => ({
    value: x,
    label: x,
    elementInfo,
  }));
  const ownerOptions = (elementInfo.owner?.selectors ?? []).map((x) => ({
    value: x,
    label: x,
    elementInfo: elementInfo.owner,
  }));
  const known = new Set([
    ...elementInfo.selectors,
    ...(elementInfo.owner?.selectors ?? []),
  ]);
  return [
    ...options,
    ...ownerOptions,
    ...uniq(extra.filter((x) => !known.has(x))).map((x) => ({
      value: x,
      label: x,
    })),
  ];
}

const SelectorSelectorField: React.FunctionComponent<{
  name: string;
  framework?: Framework;
  initialElement?: ElementInfo;
  selectMode?: SelectMode;
}> = ({ name, initialElement, framework, selectMode = "element" }) => {
  const { port } = useContext(DevToolsContext);

  const [field, , helpers] = useField(name);
  const [element, setElement] = useState<ElementInfo>(initialElement);
  const [created, setCreated] = useState([]);
  const [isSelecting, setSelecting] = useState(false);

  const options: SelectorOptions = useMemo(
    () => makeOptions(element, [...created, field.value]),
    [created, element, field.value]
  );

  const select = useCallback(async () => {
    setSelecting(true);
    try {
      const selected = await selectElement(port, {
        framework,
        mode: selectMode,
      });
      setElement(selected);
      helpers.setValue(selected.selectors[0]);
    } finally {
      setSelecting(false);
    }
  }, [framework, setSelecting]);

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
          createOptionPosition="first"
          isDisabled={isSelecting}
          options={options}
          components={{ Option: CustomOption }}
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
