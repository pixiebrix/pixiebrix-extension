// Issues with mis-matched type signatures between @types/react-table 7.7.2+ and react-table-config.d.ts
//  resulted in modifying the type signatures in this file.
//  Once the @types/react-table resolves this issue, this file can be updated.
//  Reference: https://github.com/pixiebrix/pixiebrix-extension/issues/1437

import {
  UseExpandedHooks,
  UseExpandedInstanceProps,
  UseExpandedOptions,
  UseExpandedRowProps,
  UseExpandedState,
  UseRowStateRowProps,
  UseRowStateCellProps,
  UseGlobalFiltersInstanceProps,
  UseGlobalFiltersColumnOptions,
  UseSortByColumnOptions,
  UseSortByColumnProps,
  UseSortByHooks,
  UseSortByInstanceProps,
  UseSortByOptions,
  UseSortByState,
  UseGroupByCellProps,
  UseGroupByColumnOptions,
  UseGroupByColumnProps,
  UseGroupByHooks,
  UseGroupByInstanceProps,
  UseGroupByOptions,
  UseGroupByRowProps,
  UseGroupByState,
  UseFiltersColumnOptions,
  UseFiltersColumnProps,
  UseFiltersInstanceProps,
  UseFiltersOptions,
  UseFiltersState,
} from "react-table";

// eslint-disable-next-line @typescript-eslint/ban-types -- index signature required for extension
type ActionOptions<D extends object> = Partial<{
  actions: Record<string, (...args: unknown[]) => void>;
}>;

// eslint-disable-next-line @typescript-eslint/ban-types -- index signature required for extension
export interface ActionInstanceProps<D extends object> {
  actions: Record<string, (...args: unknown[]) => void>;
}

declare module "react-table" {
  // Add entries for any plugins we use in the project. See the GitHub for all of the possible plugins/configurations
  // https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-table

  // eslint-disable-next-line @typescript-eslint/ban-types -- index signature required for extension
  export interface TableOptions<D extends object>
    extends UseExpandedOptions<D>,
      UseFiltersOptions<D>,
      UseGroupByOptions<D>,
      UseSortByOptions<D>,
      ActionOptions<D> {}

  // eslint-disable-next-line @typescript-eslint/ban-types -- index signature required for extension
  export interface Hooks<D extends object = {}>
    extends UseExpandedHooks<D>,
      UseGroupByHooks<D>,
      UseSortByHooks<D> {}

  // eslint-disable-next-line @typescript-eslint/ban-types -- index signature required for extension
  export interface TableInstance<D extends object = {}>
    extends UseExpandedInstanceProps<D>,
      UseFiltersInstanceProps<D>,
      UseGroupByInstanceProps<D>,
      UseGlobalFiltersInstanceProps<D>,
      UseSortByInstanceProps<D> {}

  // eslint-disable-next-line @typescript-eslint/ban-types -- index signature required for extension
  export interface TableState<D extends object = {}>
    extends UseExpandedState<D>,
      UseFiltersState<D>,
      UseGroupByState<D>,
      UseSortByState<D> {}

  // eslint-disable-next-line @typescript-eslint/ban-types -- index signature required for extension
  export interface ColumnInterface<D extends object = {}>
    extends UseGlobalFiltersColumnOptions<D>,
      UseFiltersColumnOptions<D>,
      UseGroupByColumnOptions<D>,
      UseSortByColumnOptions<D> {}

  // eslint-disable-next-line @typescript-eslint/ban-types -- index signature required for extension
  export interface ColumnInstance<D extends object = {}>
    extends UseFiltersColumnProps<D>,
      UseGroupByColumnProps<D>,
      UseSortByColumnProps<D> {}

  // eslint-disable-next-line @typescript-eslint/ban-types -- index signature required for extension
  export interface Cell<D extends object = {}, V = any>
    extends UseRowStateCellProps<D>,
      UseGroupByCellProps<D> {}

  // eslint-disable-next-line @typescript-eslint/ban-types -- index signature required for extension
  export interface Row<D extends object = {}>
    extends UseExpandedRowProps<D>,
      UseRowStateRowProps<D>,
      UseGroupByRowProps<D> {}
}
