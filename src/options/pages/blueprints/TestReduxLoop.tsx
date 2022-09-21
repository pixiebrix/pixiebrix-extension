import React, { useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { selectActiveTab } from "@/options/pages/blueprints/blueprintsSelectors";
import useReduxState from "@/hooks/useReduxState";
import blueprintsSlice from "@/options/pages/blueprints/blueprintsSlice";
import {
  Column,
  TableInstance,
  useFilters,
  useGlobalFilter,
  useGroupBy,
  useSortBy,
  useTable,
} from "react-table";
import { InstallableViewItem } from "@/options/pages/blueprints/blueprintsTypes";

const testData: InstallableViewItem[] = [];
const testColumns: Array<Column<InstallableViewItem>> = [];

const TestChild: React.FunctionComponent<{
  testProp: TableInstance<InstallableViewItem>;
}> = ({ testProp }) => {
  const [activeTab, setActiveTab] = useReduxState(
    selectActiveTab,
    blueprintsSlice.actions.setActiveTab
  );

  useEffect(() => {
    if (activeTab.key === null) {
      setActiveTab({
        key: "Test key",
        tabTitle: "Hello world",
        filters: [],
      });
    }
  });

  return <div>test</div>;
};

const TestReduxLoop: React.FunctionComponent = () => {
  const activeTab = useSelector(selectActiveTab);

  const tableInstance = useTable<InstallableViewItem>(
    {
      columns: testColumns,
      data: testData,
      initialState: {
        filters: activeTab.filters,
      },
      useControlledState: (state) =>
        useMemo(
          () => ({
            ...state,
            filters: activeTab.filters,
          }),
          // eslint-disable-next-line react-hooks/exhaustive-deps -- table props are required dependencies
          [state, activeTab.filters]
        ),
    },
    useFilters
  );

  return <TestChild testProp={tableInstance} />;
};

export default TestReduxLoop;
