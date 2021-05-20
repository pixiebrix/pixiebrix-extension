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
import { OptionsType, components } from "react-select";
import { uniqBy, compact, sortBy, unary, isEmpty } from "lodash";
import Creatable from "react-select/creatable";

import { Badge, Button } from "react-bootstrap";
import { faMousePointer } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { selectElement } from "@/background/devtools/index";
import { DevToolsContext } from "@/devTools/context";
import { SelectMode } from "@/nativeEditor/selector";
import { ElementInfo } from "@/nativeEditor/frameworks";
import * as nativeOperations from "@/background/devtools/index";
import { Framework } from "@/messaging/constants";
import { reportError } from "@/telemetry/logging";

// eslint is complaining that it can't parse the Option file
// eslint-disable-next-line import/namespace
import { OptionProps } from "react-select/src/components/Option";
import { useToasts } from "react-toast-notifications";

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
        {props.data.elementInfo?.tagName && (
          <Badge variant="dark" className="mr-1 pb-1">
            {props.data.elementInfo.tagName}
          </Badge>
        )}
        {props.data.elementInfo?.hasData && (
          <Badge variant="info" className="mx-1 pb-1">
            Data
          </Badge>
        )}
        {children}
      </div>
    </components.Option>
  );
};

function unrollValues(elementInfo: ElementInfo): OptionValue[] {
  if (!elementInfo) {
    return [];
  }
  return [
    ...(elementInfo.selectors ?? []).map((value) => ({ value, elementInfo })),
    ...compact([elementInfo.parent]).flatMap(unrollValues),
  ].filter((x) => x.value && x.value.trim() !== "");
}

function makeOptions(
  elementInfo: ElementInfo | null,
  extra: string[] = []
): SelectorOptions {
  return uniqBy(
    [...unrollValues(elementInfo), ...extra.map((value) => ({ value }))],
    (x) => x.value
  ).map((option) => ({
    ...option,
    label: option.value,
  }));
}

interface CommonProps {
  initialElement?: ElementInfo;
  framework?: Framework;
  selectMode?: SelectMode;
  traverseUp?: number;
  isClearable?: boolean;
  sort?: boolean;
  root?: string;
  disabled?: boolean;
}

export const SelectorSelectorControl: React.FunctionComponent<
  CommonProps & {
    value: string;
    onSelect: (selector: string) => void;
  }
> = ({
  value,
  onSelect,
  initialElement,
  framework,
  selectMode = "element",
  traverseUp = 0,
  isClearable = false,
  sort = false,
  root = undefined,
  disabled = false,
}) => {
  const { port } = useContext(DevToolsContext);
  const { addToast } = useToasts();
  const [element, setElement] = useState<ElementInfo>(initialElement);
  const [created, setCreated] = useState([]);
  const [isSelecting, setSelecting] = useState(false);

  const options: SelectorOptions = useMemo(() => {
    const raw = makeOptions(element, compact([...created, value]));
    return sort ? sortBy(raw, (x) => x.value.length) : raw;
  }, [created, element, value, sort]);

  const select = useCallback(async () => {
    setSelecting(true);
    try {
      const selected = await selectElement(port, {
        framework,
        mode: selectMode,
        traverseUp,
        root,
      });

      if (isEmpty(selected)) {
        reportError(new Error("selectElement returned empty object"));
        addToast("Unknown error selecting element", {
          appearance: "error",
          autoDismiss: true,
        });
        return;
      }

      setElement(selected);

      const selectors = selected.selectors ?? [];

      const firstSelector = (sort
        ? sortBy(selectors, (x) => x.length)
        : selectors)[0];

      console.debug("Setting selector", { selected, firstSelector });
      onSelect(firstSelector);
    } catch (err) {
      reportError(err);
      addToast(`Error selecting element: ${err.toString()} `, {
        appearance: "error",
        autoDismiss: true,
      });
    } finally {
      setSelecting(false);
    }
  }, [
    framework,
    addToast,
    setSelecting,
    traverseUp,
    selectMode,
    setElement,
    onSelect,
    root,
  ]);

  return (
    <div className="d-flex">
      <div>
        <Button
          onClick={select}
          disabled={isSelecting || disabled}
          variant="info"
          aria-label="Select element"
        >
          <FontAwesomeIcon icon={faMousePointer} />
        </Button>
      </div>
      <div className="flex-grow-1">
        <Creatable
          isClearable={isClearable}
          createOptionPosition="first"
          isDisabled={isSelecting || disabled}
          options={options}
          components={{ Option: CustomOption }}
          onCreateOption={(inputValue) => {
            setCreated([...created, inputValue]);
            onSelect(inputValue);
          }}
          value={options.find((x) => x.value === value)}
          onMenuClose={() => {
            nativeOperations
              .toggleSelector(port, {
                selector: null,
                on: false,
              })
              .catch(unary(reportError));
          }}
          onChange={async (option) => {
            console.debug("selected", { option });
            onSelect(option ? (option as OptionValue).value : null);
            nativeOperations
              .toggleSelector(port, {
                selector: null,
                on: false,
              })
              .catch(unary(reportError));
          }}
        />
      </div>
    </div>
  );
};

const SelectorSelectorField: React.FunctionComponent<
  CommonProps & { name?: string }
> = ({ name, ...props }) => {
  const [field, , helpers] = useField(name);
  const setValue = useCallback((value: string) => helpers.setValue(value), [
    helpers.setValue,
  ]);
  return (
    <SelectorSelectorControl
      value={field.value}
      onSelect={setValue}
      {...props}
    />
  );
};

export default SelectorSelectorField;
