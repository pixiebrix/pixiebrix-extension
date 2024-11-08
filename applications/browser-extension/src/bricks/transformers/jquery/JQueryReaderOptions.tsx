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

import React, { type ChangeEvent, useCallback, useMemo, useState } from "react";
import { type BrickOptionProps } from "../../../components/fields/schemaFields/genericOptionsFactory";
import { compact, isEmpty, partial, truncate } from "lodash";
import { useField } from "formik";
import {
  type ChildrenSelector,
  type SingleSelector,
} from "../../readers/jquery";
import { Button, FormControl } from "react-bootstrap";
import { type SafeString } from "../../../types/stringTypes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { produce } from "immer";
import SchemaField from "../../../components/fields/schemaFields/SchemaField";
import WorkshopMessage from "../../../components/fields/schemaFields/WorkshopMessage";
import FieldTemplate from "../../../components/form/FieldTemplate";
import styles from "./JQueryReaderOptions.module.scss";
import SelectWidget, {
  type SelectLike,
} from "../../../components/form/widgets/SelectWidget";
import useAsyncState from "../../../hooks/useAsyncState";
import { getAttributeExamples } from "../../../contentScript/messenger/api";
import { fallbackValue } from "../../../utils/asyncStateUtils";
import { type AttributeExample } from "../../../contentScript/pageEditor/types";
import CollapsibleFieldSection from "../../../pageEditor/fields/CollapsibleFieldSection";
import cx from "classnames";
import { type Expression, type TemplateEngine } from "../../../types/runtimeTypes";
import { isTemplateExpression, isVarExpression } from "../../../utils/expressionUtils";
import { joinName } from "../../../utils/formUtils";
import { freshIdentifier } from "../../../utils/variableUtils";
import useAsyncEffect from "use-async-effect";
import { inspectedTab } from "../../../pageEditor/context/connection";
import { type SetOptional } from "type-fest";

/**
 * Version of SelectorConfig where fields may be expressions.
 * @see SelectorConfig
 */
type SelectorDefinition = {
  selector: string | Expression<string, TemplateEngine>;

  multi: boolean | Expression<boolean, TemplateEngine>;

  attr?: string | Expression<string, TemplateEngine>;

  data?: string | Expression<string, TemplateEngine>;

  find?: UnknownObject;
};

/**
 * Version of SelectorDefinition where `find` is known to exist.
 * @see ChildSelector
 */
type ChildSelectorDefinition = SelectorDefinition & {
  find: UnknownObject;

  attr?: never;

  data?: never;
};

function isChildrenSelectorDefinition(
  selector: SelectorDefinition,
): selector is ChildSelectorDefinition {
  return "find" in selector;
}

/**
 * @see SelectorConfigMap
 */
type SelectorDefinitionMap = Record<
  string,
  string | Expression<string, TemplateEngine> | SelectorDefinition
>;

type SelectorItem = {
  name: string;
  selector: SelectorDefinition;
};

/**
 * Normalize the shape of the selector definition to use the object form the selector definition.
 */
function normalizeSelectorDefinitionShape(
  selectors: SelectorDefinitionMap,
): SelectorItem[] {
  return Object.entries(selectors).map(([name, selector]) => {
    if (typeof selector === "string" || isTemplateExpression(selector)) {
      return { name, selector: { selector, multi: false } };
    }

    // Fill in `multi` default to avoid SchemaField getting stuck in Loading... state
    return { name, selector: { ...selector, multi: selector.multi ?? false } };
  });
}

const ATTRIBUTE_OPTION_VALUE_PREFIX = "attr:";

const DATA_ATTRIBUTE_PREFIX = "data-";

const BASE_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "element", label: "Element" },
];

export function inferActiveTypeOption(
  selectorDefinition: SelectorDefinition,
): string {
  if (isChildrenSelectorDefinition(selectorDefinition)) {
    return "element";
  }

  if (!isEmpty(selectorDefinition.attr)) {
    return [ATTRIBUTE_OPTION_VALUE_PREFIX, selectorDefinition.attr].join("");
  }

  if (!isEmpty(selectorDefinition.data)) {
    return [
      ATTRIBUTE_OPTION_VALUE_PREFIX,
      DATA_ATTRIBUTE_PREFIX,
      selectorDefinition.data,
    ].join("");
  }

  return "text";
}

export function typeOptionsFactory(
  attributeExamples: AttributeExample[],
  currentValue: string,
) {
  const typeOptions = [
    ...BASE_TYPE_OPTIONS,
    ...(attributeExamples ?? []).map((example) => ({
      value: [ATTRIBUTE_OPTION_VALUE_PREFIX, example.name].join(""),
      label: `${example.name} - ${truncate(example.value, {
        length: 30,
        omission: "...",
      })}`,
    })),
  ];

  // Ensure the dropdown contains the active options
  if (!typeOptions.some((option) => option.value === currentValue)) {
    typeOptions.push({
      value: currentValue,
      label: currentValue.slice(ATTRIBUTE_OPTION_VALUE_PREFIX.length),
    });
  }

  return typeOptions;
}

const SelectorCard: React.FC<{
  /**
   * Name of the property. Not the Formik field name.
   */
  name: string;
  /**
   * The selector definition.
   */
  selectorDefinition: SelectorDefinition;
  /**
   * Change handler, to handle changes to name and non-schema fields.
   */
  onChange: (item: SelectorItem) => void;
  /**
   * Delete handler, or undefined if selector item cannot be deleted.
   */
  onDelete: (() => void) | undefined;
  /**
   * The Formik path to selector configuration.
   */
  path: string;
  /**
   * A selector for the SelectorRoot, or null for the document or unknown.
   */
  rootSelector: string | null;
  /**
   * Depth of nested selectors, default 0.
   */
  nestingLevel?: number;
}> = ({
  name: initialName,
  selectorDefinition,
  onChange,
  onDelete,
  path,
  rootSelector,
  nestingLevel = 0,
}) => {
  const configName = partial(joinName, path);
  const [name, setName] = useState(initialName);
  const [expanded, setExpanded] = useState(true);

  const [{ value: isMulti }, , { setValue: setMulti }] = useField<boolean>(
    configName("multi"),
  );

  const { data: attributeExamples } = fallbackValue(
    useAsyncState(async () => {
      if (typeof selectorDefinition.selector === "string") {
        return getAttributeExamples(
          inspectedTab,
          compact([rootSelector, selectorDefinition.selector]).join(" "),
        );
      }

      return [];
    }, [selectorDefinition.selector, rootSelector]),
    [] as AttributeExample[],
  );

  const typeOption = inferActiveTypeOption(selectorDefinition);
  const typeOptions = typeOptionsFactory(attributeExamples, typeOption);

  return (
    <CollapsibleFieldSection
      expanded={expanded}
      toggleExpanded={() => {
        setExpanded((expanded) => !expanded);
      }}
      title={
        <div className="d-flex justify-content-between w-100">
          <div className={styles.nameInput}>
            <FormControl
              type="text"
              aria-label="Property name"
              placeholder="Property name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              // Use onBlur instead of onChange for committing the change to prevent the field from being de-duped
              // if the there's an intermediate state that has the same name as another field.
              onBlur={(event: React.FocusEvent<HTMLInputElement>) => {
                if (event.target.value) {
                  onChange({
                    name: event.target.value,
                    selector: selectorDefinition,
                  });
                } else {
                  setName(initialName);
                }
              }}
            />
          </div>
          <Button variant="danger" onClick={onDelete} disabled={!onDelete}>
            <FontAwesomeIcon icon={faTrash} />
          </Button>
        </div>
      }
    >
      <div>
        <SchemaField
          name={configName("selector")}
          isRequired
          label="Selector"
          // @ts-expect-error -- known to be SelectorSelectorWidget and props are passed through
          isMulti={isMulti}
          onChange={(_: string, multi: boolean) => {
            void setMulti(multi);
          }}
          root={rootSelector}
          schema={{
            type: "string",
            format: "selector",
            description:
              "A jQuery or CSS selector. Use the selection tool to automatically generate a selector.",
          }}
        />

        <SchemaField
          name={configName("multi")}
          isRequired
          label="Select All"
          schema={{
            type: "boolean",
            description:
              "True to match all elements as an array. If toggled off and multiple elements are found, the brick will raise an error.",
          }}
        />

        <FieldTemplate
          name="type"
          as={SelectWidget}
          label="Extract"
          description="Extract Text or an attribute. Or, select Element to extract nested properties."
          value={typeOption}
          options={typeOptions}
          onChange={(event: ChangeEvent<SelectLike>) => {
            const next = event.target.value;

            onChange({
              name,
              selector: produce(selectorDefinition, (draft) => {
                // `draft` is either a SingleSelector or a ChildrenSelector. Cast as intersection type so we can clean
                // up the values in the alternative type.
                const commonDraft = draft as SingleSelector &
                  SetOptional<ChildrenSelector, "find">;

                if (next?.startsWith(ATTRIBUTE_OPTION_VALUE_PREFIX)) {
                  const attributeName = next.slice(
                    ATTRIBUTE_OPTION_VALUE_PREFIX.length,
                  );
                  if (attributeName.startsWith(DATA_ATTRIBUTE_PREFIX)) {
                    delete commonDraft.attr;
                    delete commonDraft.find;
                    commonDraft.data = attributeName.slice(
                      DATA_ATTRIBUTE_PREFIX.length,
                    );
                  } else {
                    delete commonDraft.data;
                    delete commonDraft.find;
                    commonDraft.attr = attributeName;
                  }

                  return draft;
                }

                if (next === "text") {
                  delete commonDraft.attr;
                  delete commonDraft.data;
                  delete commonDraft.find;
                  return draft;
                }

                if (next === "element") {
                  delete commonDraft.attr;
                  delete commonDraft.data;
                  // Start with one property so the user doesn't have to add one.
                  commonDraft.find = {
                    property: {
                      selector: "",
                    },
                  };
                  return draft;
                }
              }),
            });
          }}
        />

        {isChildrenSelectorDefinition(selectorDefinition) && (
          // eslint-disable-next-line @typescript-eslint/no-use-before-define -- co-recursion
          <SelectorsOptions
            path={configName("find")}
            nestingLevel={nestingLevel + 1}
            rootSelector={
              typeof selectorDefinition.selector === "string"
                ? selectorDefinition.selector
                : null
            }
          />
        )}
      </div>
    </CollapsibleFieldSection>
  );
};

const SelectorsOptions: React.FC<{
  path: string;
  rootSelector: string | null;
  nestingLevel: number;
}> = ({ path, rootSelector, nestingLevel }) => {
  const configName = partial(joinName, path);

  const [{ value: rawSelectors }, , fieldHelpers] =
    useField<SelectorDefinitionMap>(path);

  const selectorItems = useMemo(
    () => normalizeSelectorDefinitionShape(rawSelectors),
    [rawSelectors],
  );

  const setSelectorItems = useCallback(
    async (items: SelectorItem[]) => {
      await fieldHelpers.setValue(
        Object.fromEntries(items.map(({ name, selector }) => [name, selector])),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fieldHelpers.setValue changes on every render
    [],
  );

  const containsUnsupportedVariable =
    isVarExpression(rawSelectors) ||
    Object.values(rawSelectors).some((x) => isVarExpression(x));

  // Normalize simple configuration to object to ensure Formik paths work
  useAsyncEffect(async () => {
    if (
      !containsUnsupportedVariable &&
      Object.values(rawSelectors).some(
        (x) => typeof x === "string" || isTemplateExpression(x),
      )
    ) {
      await setSelectorItems(selectorItems);
    }
  }, [
    rawSelectors,
    selectorItems,
    setSelectorItems,
    containsUnsupportedVariable,
  ]);

  if (containsUnsupportedVariable) {
    return <WorkshopMessage />;
  }

  return (
    <div>
      <Button
        className="mb-3"
        size="sm"
        onClick={async () => {
          await setSelectorItems([
            ...selectorItems,
            {
              name: freshIdentifier(
                "property" as SafeString,
                selectorItems.map((x) => x.name),
              ),
              selector: { selector: "", multi: false },
            },
          ]);
        }}
      >
        <FontAwesomeIcon icon={faPlus} /> Add Property
      </Button>

      <div className={cx({ "pl-2": nestingLevel > 0 })}>
        {selectorItems.map(({ name, selector }, index) => (
          <SelectorCard
            name={name}
            rootSelector={rootSelector}
            selectorDefinition={selector}
            // It's safe to use name because the SelectorCard only commits name changes on blur.
            key={name}
            onChange={async (item) => {
              await setSelectorItems(
                produce(selectorItems, (draft) => {
                  // eslint-disable-next-line security/detect-object-injection -- index is a number
                  draft[index] = item;
                }),
              );
            }}
            onDelete={
              selectorItems.length > 1
                ? async () => {
                    await setSelectorItems(
                      selectorItems.filter((_, i) => i !== index),
                    );
                  }
                : undefined
            }
            path={configName(name)}
          />
        ))}
      </div>
    </div>
  );
};

const JQueryReaderOptions: React.FC<
  BrickOptionProps & { selectorsProp?: string }
> = ({ name, configKey }) => {
  const basePath = joinName(name, configKey);
  const configName = partial(joinName, basePath);
  return (
    <SelectorsOptions
      path={configName("selectors")}
      rootSelector={null}
      nestingLevel={0}
    />
  );
};

export default JQueryReaderOptions;
