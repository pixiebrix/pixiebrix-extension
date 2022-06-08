import React, { ChangeEvent } from "react";
import FieldTemplate from "@/components/form/FieldTemplate";
import SwitchButtonWidget, {
  CheckBoxLike,
} from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import { isEmpty, partial } from "lodash";
import { makeLockableFieldProps } from "@/pageEditor/fields/makeLockableFieldProps";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import NumberWidget from "@/components/fields/schemaFields/widgets/NumberWidget";
import BooleanWidget from "@/components/fields/schemaFields/widgets/BooleanWidget";
import { useField, useFormikContext } from "formik";
import { DebounceOptions } from "@/extensionPoints/triggerExtension";
import { joinName } from "@/utils";
import { TriggerFormState } from "@/pageEditor/extensionPoints/formStateTypes";

const DebounceFieldSet: React.FC<{
  isLocked: boolean;
}> = ({ isLocked }) => {
  const { setFieldValue } = useFormikContext<TriggerFormState>();

  const fieldName = partial(joinName, "extensionPoint.definition");

  const [{ value: debounce }] = useField<DebounceOptions | null>(
    fieldName("debounce")
  );

  return (
    <>
      <FieldTemplate
        as={SwitchButtonWidget}
        description="Debounce the trigger"
        name="debounce"
        value={!isEmpty(debounce)}
        onChange={({ target }: ChangeEvent<CheckBoxLike>) => {
          if (target.value) {
            setFieldValue(fieldName("debounce"), {
              waitMillis: 250,
              leading: false,
              trailing: true,
            });
          } else {
            setFieldValue(fieldName("debounce"), null);
          }
        }}
        {...makeLockableFieldProps("Debounce", isLocked)}
      />

      {debounce && (
        <>
          <ConnectedFieldTemplate
            name={fieldName("debounce", "waitMillis")}
            as={NumberWidget}
            description="The number of milliseconds to delay"
            {...makeLockableFieldProps("Delay Millis", isLocked)}
          />
          <ConnectedFieldTemplate
            name={fieldName("debounce", "leading")}
            as={BooleanWidget}
            description="Specify invoking on the leading edge of the debounced timeout."
            {...makeLockableFieldProps("Leading", isLocked)}
          />
          <ConnectedFieldTemplate
            name={fieldName("debounce", "trailing")}
            as={BooleanWidget}
            description="Specify invoking on the trailing edge of the debounced timeout."
            {...makeLockableFieldProps("Trailing", isLocked)}
          />
        </>
      )}
    </>
  );
};

export default DebounceFieldSet;
