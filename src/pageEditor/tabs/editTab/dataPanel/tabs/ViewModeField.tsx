import React from "react";
import { FormCheck } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/pageEditor/store/editor/pageEditorTypes";
import { selectNodeDataPanelTabState } from "@/pageEditor/store/editor/editorSelectors";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import styles from "@/pageEditor/tabs/editTab/dataPanel/tabs/ViewModeToggle.module.scss";
import PopoverInfoLabel from "@/components/form/popoverInfoLabel/PopoverInfoLabel";
import FieldTemplate from "@/components/form/FieldTemplate";

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
  onSelect: () => void;
}> = ({ viewMode, name, isChecked, onSelect, label }) => (
  <FormCheck
    id={`${name}-${viewMode}`}
    name={name}
    label={label}
    type="radio"
    value={viewMode}
    checked={isChecked}
    onChange={() => {
      onSelect();
    }}
  />
);

const ViewModeWidget: React.FunctionComponent<{
  name: string;
  defaultValue: string;
  tabKey: DataPanelTabKey;
  viewModeOptions: ViewModeOption[];
}> = ({ defaultValue, tabKey, viewModeOptions, name }) => {
  const dispatch = useDispatch();

  const { viewMode = defaultValue } =
    useSelector((state: RootState) =>
      selectNodeDataPanelTabState(state, tabKey),
    ) ?? {};

  const setViewMode = (nextViewMode: string) => {
    dispatch(
      actions.setNodeDataPanelTabViewMode({
        tabKey: DataPanelTabKey.Input,
        viewMode: nextViewMode,
      }),
    );
  };

  return (
    <div className={styles.viewToggle}>
      {viewModeOptions.map(({ value, label, description }) => (
        <ViewModeRadio
          key={value}
          name={name}
          viewMode={value}
          isChecked={viewMode === value}
          onSelect={() => {
            setViewMode(value);
          }}
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
};

const ViewModeField: React.FC<{
  name: string;
  viewModeOptions: ViewModeOption[];
}> = ({ name, viewModeOptions }) => (
  <FieldTemplate
    name={name}
    label="View"
    fitLabelWidth
    as={ViewModeWidget}
    viewModeOptions={viewModeOptions}
  />
);

export default ViewModeField;
