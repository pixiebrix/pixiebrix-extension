import React, { type ChangeEventHandler } from "react";
import { FormCheck } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/pageEditor/store/editor/pageEditorTypes";
import { selectNodeDataPanelTabState } from "@/pageEditor/store/editor/editorSelectors";
import { type DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import styles from "@/pageEditor/tabs/editTab/dataPanel/tabs/ViewModeField.module.scss";
import PopoverInfoLabel from "@/components/form/popoverInfoLabel/PopoverInfoLabel";
import FieldTemplate, {
  type CustomFieldWidget,
} from "@/components/form/FieldTemplate";

export type ViewModeOption<T extends string = string> = {
  /**
   * Option value.
   */
  value: T;
  /**
   * Radio-button label.
   */
  label: string;
  /**
   * Optional description to display a help icon/popover.
   */
  description?: string;
};

const ViewModeRadio: React.FunctionComponent<{
  label: React.ReactNode;
  name: string;
  value: string;
  isChecked: boolean;
  onSelect: ChangeEventHandler<HTMLInputElement>;
}> = ({ value, name, isChecked, onSelect, label }) => (
  <FormCheck
    id={`${name}-${value}`}
    name={name}
    label={label}
    type="radio"
    value={value}
    checked={isChecked}
    onChange={onSelect}
  />
);

type ViewModeWidgetProps = {
  name: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  tabKey: DataPanelTabKey;
  viewModeOptions: ViewModeOption[];
};

const ViewModeWidget: CustomFieldWidget<
  string,
  HTMLInputElement,
  ViewModeWidgetProps
> = ({ value: currentValue, onChange, viewModeOptions, name }) => (
  <div className={styles.viewToggle}>
    {viewModeOptions.map(({ value, label, description }) => (
      <ViewModeRadio
        key={value}
        name={name}
        value={value}
        isChecked={currentValue === value}
        onSelect={onChange}
        label={
          <span>
            {description == null ? (
              label
            ) : (
              <PopoverInfoLabel
                name={value}
                label={label}
                description={description}
              />
            )}
          </span>
        }
      />
    ))}
  </div>
);

/**
 * Data Panel tab view selector
 * @since 2.0.6 introduced to reduce the number of Data Panel tabs
 */
const ViewModeField: React.FC<{
  name: string;
  label?: string;
  viewModeOptions: ViewModeOption[];
  tabKey: DataPanelTabKey;
  defaultValue: ViewModeOption["value"];
}> = ({ name, label = "View", tabKey, viewModeOptions, defaultValue }) => {
  const dispatch = useDispatch();

  const { viewMode } =
    useSelector((state: RootState) =>
      selectNodeDataPanelTabState(state, tabKey),
    ) ?? {};

  const setViewMode: ChangeEventHandler<HTMLInputElement> = (event) => {
    dispatch(
      actions.setNodeDataPanelTabViewMode({
        tabKey,
        viewMode: event.target.value,
      }),
    );
  };

  return (
    <FieldTemplate
      name={name}
      label={label}
      value={viewMode ?? defaultValue}
      onChange={setViewMode}
      as={ViewModeWidget}
      viewModeOptions={viewModeOptions}
      className={styles.formGroup}
    />
  );
};

export default ViewModeField;
