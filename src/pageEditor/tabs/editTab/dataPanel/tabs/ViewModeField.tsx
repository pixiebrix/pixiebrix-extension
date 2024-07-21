import React, { type ChangeEventHandler } from "react";
import { FormCheck } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/pageEditor/store/editor/pageEditorTypes";
import { selectNodeDataPanelTabState } from "@/pageEditor/store/editor/editorSelectors";
import { type DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import styles from "@/pageEditor/tabs/editTab/dataPanel/tabs/ViewModeToggle.module.scss";
import PopoverInfoLabel from "@/components/form/popoverInfoLabel/PopoverInfoLabel";
import FieldTemplate, {
  type CustomFieldWidget,
} from "@/components/form/FieldTemplate";

export type ViewModeOption<T extends string = string> = {
  value: T;
  label: string;
  description: string;
};

const ViewModeRadio: React.FunctionComponent<{
  label: React.ReactNode;
  name: string;
  viewMode: string;
  isChecked: boolean;
  onSelect: ChangeEventHandler<HTMLInputElement>;
}> = ({ viewMode, name, isChecked, onSelect, label }) => (
  <FormCheck
    id={`${name}-${viewMode}`}
    name={name}
    label={label}
    type="radio"
    value={viewMode}
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
        viewMode={value}
        isChecked={currentValue === value}
        onSelect={onChange}
        label={
          <span>
            <PopoverInfoLabel
              name={value}
              label={label}
              description={description}
            />
          </span>
        }
      />
    ))}
  </div>
);

const ViewModeField: React.FC<{
  name: string;
  viewModeOptions: ViewModeOption[];
  tabKey: DataPanelTabKey;
  defaultValue: ViewModeOption["value"];
}> = ({ name, tabKey, viewModeOptions, defaultValue }) => {
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
      label="View"
      value={viewMode ?? defaultValue}
      onChange={setViewMode}
      fitLabelWidth
      as={ViewModeWidget}
      viewModeOptions={viewModeOptions}
    />
  );
};

export default ViewModeField;
