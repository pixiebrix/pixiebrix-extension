/* eslint-disable @typescript-eslint/ban-types -- index signature required for extension */

import {
  type UseExpandedHooks,
  type UseExpandedInstanceProps,
  type UseExpandedOptions,
  type UseExpandedRowProps,
  type UseExpandedState,
  type UseRowStateRowProps,
  type UseRowStateCellProps,
  type UseGlobalFiltersColumnOptions,
  type UseGlobalFiltersInstanceProps,
  type UseGlobalFiltersOptions,
  type UseGlobalFiltersState,
  type UseSortByColumnOptions,
  type UseSortByColumnProps,
  type UseSortByHooks,
  type UseSortByInstanceProps,
  type UseSortByOptions,
  type UseSortByState,
  type UseGroupByCellProps,
  type UseGroupByColumnOptions,
  type UseGroupByColumnProps,
  type UseGroupByHooks,
  type UseGroupByInstanceProps,
  type UseGroupByOptions,
  type UseGroupByRowProps,
  type UseGroupByState,
  type UseFiltersColumnOptions,
  type UseFiltersColumnProps,
  type UseFiltersInstanceProps,
  type UseFiltersOptions,
  type UseFiltersState,
  type UsePaginationInstanceProps,
  type UseResizeColumnsColumnProps,
  type UsePaginationState,
} from "react-table";

type ActionOptions<D extends object> = Partial<{
  actions: Record<string, (...args: unknown[]) => void>;
}>;

declare module "react-table" {
  // Add entries for any plugins we use in the project. See the GitHub for all of the possible plugins/configurations
  // https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-table

  export interface TableOptions<D extends object>
    extends UseExpandedOptions<D>,
      UseFiltersOptions<D>,
      UseGlobalFiltersOptions<D>,
      UseGroupByOptions<D>,
      UseSortByOptions<D>,
      ActionOptions<D> {}

  export interface Hooks<D extends object = {}>
    extends UseExpandedHooks<D>,
      UseGroupByHooks<D>,
      UseSortByHooks<D> {}

  export interface TableInstance<D extends object = {}>
    extends UseExpandedInstanceProps<D>,
      UseFiltersInstanceProps<D>,
      UseGroupByInstanceProps<D>,
      UseGlobalFiltersInstanceProps<D>,
      UsePaginationInstanceProps<D>,
      UseSortByInstanceProps<D> {}

  export interface TableState<D extends object = {}>
    extends UseExpandedState<D>,
      UseFiltersState<D>,
      UseGlobalFiltersState<D>,
      UsePaginationState<D>,
      UseGroupByState<D>,
      UseSortByState<D> {}

  export interface ColumnInterface<D extends object = {}>
    extends UseGlobalFiltersColumnOptions<D>,
      UseFiltersColumnOptions<D>,
      UseGlobalFiltersColumnOptions<D>,
      UseGroupByColumnOptions<D>,
      UseSortByColumnOptions<D> {}

  export interface ColumnInstance<D extends object = {}>
    extends UseFiltersColumnProps<D>,
      UseGroupByColumnProps<D>,
      UseResizeColumnsColumnProps<D>,
      UseSortByColumnProps<D> {}

  export interface Cell<D extends object = {}, V = any>
    extends UseRowStateCellProps<D>,
      UseGroupByCellProps<D> {}

  export interface Row<D extends object = {}>
    extends UseExpandedRowProps<D>,
      UseRowStateRowProps<D>,
      UseGroupByRowProps<D> {}
  export interface TableCommonProps {
    onClick: (...args: unknown[]) => void;
  }
}
