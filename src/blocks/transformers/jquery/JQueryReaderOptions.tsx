/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import React, {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { type BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { freshIdentifier, joinName } from "@/utils";
import { isEmpty, partial, truncate } from "lodash";
import { useField } from "formik";
import {
  type ChildrenSelector,
  isChildrenSelector,
  type Selector,
  type SelectorMap,
  type SingleSelector,
} from "@/blocks/readers/jquery";
import { Button, Card, FormControl } from "react-bootstrap";
import { type SafeString } from "@/types/stringTypes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { produce } from "immer";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { isTemplateExpression, isVarExpression } from "@/runtime/mapArgs";
import WorkshopMessage from "@/components/fields/schemaFields/WorkshopMessage";
import FieldTemplate from "@/components/form/FieldTemplate";
import styles from "./JQueryReaderOptions.module.scss";
import SelectWidget, {
  type SelectLike,
} from "@/components/form/widgets/SelectWidget";
import useAsyncState from "@/hooks/useAsyncState";
import { getAttributeExamples } from "@/contentScript/messenger/api";
import { thisTab } from "@/pageEditor/utils";
import { fallbackValue } from "@/utils/asyncStateUtils";

type SelectorItem = {
  name: string;
  selector: Selector;
};

function normalizeShape(selectors: SelectorMap): SelectorItem[] {
  return Object.entries(selectors).map(([name, selector]) => {
    if (typeof selector === "string") {
      return { name, selector: { selector } };
    }

    return { name, selector };
  });
}

const ATTR_PREFIX = "attr:";
const DATA_PREFIX = "data-";

function inferActiveTypeOption(selector: Selector): string {
  if (isChildrenSelector(selector)) {
    return "element";
  }

  if (!isEmpty(selector.attr)) {
    return `${ATTR_PREFIX}:${selector.attr}`;
  }

  if (!isEmpty(selector.data)) {
    return `${ATTR_PREFIX}:${DATA_PREFIX}-${selector.data}`;
  }

  return "text";
}

const BASE_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "element", label: "Element" },
];

const SelectorCard: React.FC<{
  /**
   * Name of the property. Not the Formik field name.
   */
  name: string;
  /**
   * The selector definition.
   */
  selector: Selector;
  /**
   * Change handler, to handle changes to name and non-schema fields.
   * @param item
   */
  onChange: (item: SelectorItem) => void;
  /**
   * Delete handler, or null if selector item cannot be deleted.
   */
  onDelete: (() => void) | null;
  /**
   * The Formik path to selector configuration.
   */
  path: string;
}> = ({ name, selector, onChange, onDelete, path }) => {
  const configName = partial(joinName, path);

  const typeOption = inferActiveTypeOption(selector);

  const [{ value: multi }] = useField<boolean>(configName("multi"));

  const { data: attributeExamples } = fallbackValue(
    useAsyncState(async () => {
      if (typeof selector.selector === "string") {
        return getAttributeExamples(thisTab, selector.selector);
      }

      return [];
    }, [selector.selector]),
    []
  );

  const typeOptions = [
    ...BASE_TYPE_OPTIONS,
    ...(attributeExamples || []).map((example) => ({
      value: `attr:${example.name}`,
      label: `${example.name} - ${truncate(example.value, {
        length: 30,
        omission: "...",
      })}`,
    })),
  ];

  // Ensure the dropdown contains the active options
  if (!typeOptions.some((option) => option.value === typeOption)) {
    typeOptions.push({
      value: typeOption,
      label: typeOption.slice(ATTR_PREFIX.length),
    });
  }

  return (
    <Card className="my-2">
      <Card.Header>
        <div className="d-flex justify-content-between">
          <div className={styles.nameInput}>
            <FormControl
              type="text"
              placeholder="Property name"
              value={name}
              onChange={(event) => {
                onChange({ name: event.target.value, selector });
              }}
            />
          </div>
          <Button variant="danger" onClick={onDelete} disabled={!onDelete}>
            <FontAwesomeIcon icon={faTrash} />
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        <SchemaField
          name={configName("selector")}
          isRequired
          label="Selector"
          multi={multi}
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
          label="Select Multiple"
          schema={{
            type: "boolean",
            description:
              "True to find multiple elements as an array. If toggled off and multiple elements are found, the brick will raise an error.",
            default: false,
          }}
        />

        <FieldTemplate
          name="type"
          as={SelectWidget}
          label="Extract"
          description="Extract text or an attribute. Or, choose element to add nested elements."
          value={typeOption}
          options={typeOptions}
          onChange={(event: ChangeEvent<SelectLike>) => {
            const next = event.target.value;

            onChange({
              name,
              selector: produce(selector, (draft) => {
                // `draft` is either a SingleSelector or a ChildrenSelector. Cast as intersection type so we can clean
                // up the values in the alternative type.
                const commonDraft = draft as SingleSelector & ChildrenSelector;

                if (next.startsWith(ATTR_PREFIX)) {
                  const attributeName = next.slice(ATTR_PREFIX.length);
                  if (attributeName.startsWith(DATA_PREFIX)) {
                    delete commonDraft.attr;
                    delete commonDraft.find;
                    commonDraft.data = attributeName.slice(DATA_PREFIX.length);
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

        {isChildrenSelector(selector) && (
          // eslint-disable-next-line @typescript-eslint/no-use-before-define -- co-recursion
          <SelectorsOptions path={configName("find")} />
        )}
      </Card.Body>
    </Card>
  );
};

// FIXME: actual type can contain expressions. Write a SelectorMapConfiguration type
type SelectorMapConfig = SelectorMap;

const SelectorsOptions: React.FC<{ path: string }> = ({ path }) => {
  const configName = partial(joinName, path);

  const [{ value: rawSelectors }, , fieldHelpers] =
    useField<SelectorMapConfig>(path);

  const selectorItems = useMemo(
    () => normalizeShape(rawSelectors),
    [rawSelectors]
  );

  const setSelectorItems = useCallback(
    (items: SelectorItem[]) => {
      fieldHelpers.setValue(
        Object.fromEntries(items.map(({ name, selector }) => [name, selector]))
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fieldHelpers.setValue changes on every render
    []
  );

  const containsVariable = Object.values(rawSelectors).some((x) =>
    isVarExpression(x)
  );

  // Normalize simple configuration to object to ensure Formik paths work
  useEffect(() => {
    if (
      !containsVariable &&
      Object.values(rawSelectors).some(
        (x) => typeof x === "string" || isTemplateExpression(x)
      )
    ) {
      setSelectorItems(selectorItems);
    }
  }, [rawSelectors, selectorItems, setSelectorItems, containsVariable]);

  if (containsVariable) {
    return <WorkshopMessage />;
  }

  return (
    <div>
      {selectorItems.map(({ name, selector }, index) => (
        // eslint-disable-next-line react/jsx-key -- can't use name because it will remount on name changes
        <SelectorCard
          name={name}
          selector={selector}
          onChange={(item) => {
            setSelectorItems(
              produce(selectorItems, (draft) => {
                // eslint-disable-next-line security/detect-object-injection -- index is a number
                draft[index] = item;
              })
            );
          }}
          onDelete={
            selectorItems.length > 1
              ? () => {
                  setSelectorItems(selectorItems.filter((_, i) => i !== index));
                }
              : null
          }
          path={configName(name)}
        />
      ))}

      <Button
        className="mb-3"
        size="sm"
        onClick={() => {
          setSelectorItems([
            ...selectorItems,
            {
              name: freshIdentifier(
                "property" as SafeString,
                selectorItems.map((x) => x.name)
              ),
              selector: { selector: "" },
            },
          ]);
        }}
      >
        <FontAwesomeIcon icon={faPlus} /> Add New Property
      </Button>
    </div>
  );
};

const JQueryReaderOptions: React.FC<
  BlockOptionProps & { selectorsProp?: string }
> = ({ name, configKey }) => {
  const basePath = joinName(name, configKey);
  const configName = partial(joinName, basePath);
  return <SelectorsOptions path={configName("selectors")} />;
};

export default JQueryReaderOptions;
