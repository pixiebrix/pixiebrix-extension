import CollapsibleFieldSection from "@/pageEditor/fields/CollapsibleFieldSection";
import { useDispatch, useSelector } from "react-redux";
import { selectActiveBrickConfigurationUIState } from "@/pageEditor/store/editor/editorSelectors";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import React from "react";

const ConnectedCollapsibleFieldSection = ({
  title,
  initialExpanded = false,
  ...rest
}: {
  children: React.ReactNode;
  title: string;
  bodyRef?: React.MutableRefObject<HTMLDivElement>;
  initialExpanded?: boolean;
}) => {
  const dispatch = useDispatch();
  const brickConfigurationUIState = useSelector(
    selectActiveBrickConfigurationUIState,
  );
  // Allow to fail gracefully using nullish coalescing operator
  const isExpanded =
    brickConfigurationUIState?.expandedFieldSections?.[title] ??
    initialExpanded;

  return (
    <CollapsibleFieldSection
      title={title}
      toggleExpanded={() => {
        dispatch(
          actions.setExpandedFieldSections({
            id: title,
            isExpanded: !isExpanded,
          }),
        );
      }}
      expanded={isExpanded}
      {...rest}
    />
  );
};

export default ConnectedCollapsibleFieldSection;
