import React from "react";
import {
  type SelectStringOption,
  type SetActiveField,
} from "@/components/formBuilder/formBuilderTypes";
import {
  moveStringInArray,
  getNormalizedUiOrder,
} from "@/components/formBuilder/formBuilderHelpers";
import { type Schema } from "@/types/schemaTypes";
import FieldTemplate from "@/components/form/FieldTemplate";
import LayoutWidget from "@/components/LayoutWidget";
import { findLast } from "lodash";
import { type FormikErrors } from "formik";
import FieldEditor from "@/components/formBuilder/edit/fieldEditor/FieldEditor";

export const ActiveField: React.FC<{
  name: string;
  activeField: string;
  setActiveField: SetActiveField;
  fieldTypes?: SelectStringOption[];
  schema?: Schema;
  uiOrder: string[];
  propertyKeys: string[];
  setUiOrder: (uiOrder: string[]) => Promise<void | FormikErrors<string[]>>;
}> = ({
  name,
  activeField,
  setActiveField,
  fieldTypes,
  schema,
  uiOrder,
  propertyKeys,
  setUiOrder,
}) => {
  const moveProperty = async (direction: "up" | "down") => {
    const nextUiOrder = moveStringInArray(
      getNormalizedUiOrder(propertyKeys, uiOrder),
      activeField,
      direction,
    );
    await setUiOrder(nextUiOrder);
  };

  // The uiOrder field may not be initialized yet
  const order = uiOrder ?? ["*"];
  const canMoveUp =
    order.length > 2
      ? order[0] !== activeField
      : propertyKeys[0] !== activeField;
  const canMoveDown =
    order.length === propertyKeys.length + 1
      ? order.at(-2) !== activeField
      : Array.isArray(order) &&
        findLast(propertyKeys, (key) => !order.includes(key)) !== activeField;

  return (
    <>
      <h6>Current Field</h6>

      {Boolean(schema?.properties?.[activeField]) && (
        <FieldEditor
          name={name}
          propertyName={activeField}
          setActiveField={setActiveField}
          fieldTypes={fieldTypes}
        />
      )}

      {(canMoveUp || canMoveDown) && (
        <FieldTemplate
          name="layoutButtons"
          label="Field Order"
          as={LayoutWidget}
          canMoveUp={canMoveUp}
          moveUp={async () => {
            await moveProperty("up");
          }}
          canMoveDown={canMoveDown}
          moveDown={async () => {
            await moveProperty("down");
          }}
        />
      )}
    </>
  );
};
