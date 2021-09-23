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

  // @ts-expect-error -- won't match the generic type definitions
  export interface TableOptions<D extends Record<string, unknown>>
    extends UseExpandedOptions<D>,
      ActionOptions<D> {}

  // @ts-expect-error -- won't match the generic type definitions
  export interface Hooks<
    D extends Record<string, unknown> = Record<string, unknown>
  > extends UseExpandedHooks<D> {}

  // @ts-expect-error -- won't match the generic type definitions
  export interface TableInstance<
    D extends Record<string, unknown> = Record<string, unknown>
  > extends UseExpandedInstanceProps<D>,
      ActionInstanceProps<D>,
      UseGlobalFiltersInstanceProps<D> {}

  // @ts-expect-error -- won't match the generic type definitions
  export interface TableState<
    D extends Record<string, unknown> = Record<string, unknown>
  > extends UseExpandedState<D> {}

  // @ts-expect-error -- won't match the generic type definitions
  export interface ColumnInterface<
    D extends Record<string, unknown> = Record<string, unknown>
  > extends UseGlobalFiltersColumnOptions<D> {}

  // @ts-expect-error -- won't match the generic type definitions
  export interface ColumnInstance<
    D extends Record<string, unknown> = Record<string, unknown>
  > extends UseExpandedOptions<D> {}

  // @ts-expect-error -- won't match the generic type definitions
  export interface Cell<
    D extends Record<string, unknown> = Record<string, unknown>,
    V = any
  > extends UseRowStateCellProps<D> {}

  // @ts-expect-error -- won't match the generic type definitions
  export interface Row<
    D extends Record<string, unknown> = Record<string, unknown>
  > extends UseExpandedRowProps<D>,
      UseRowStateRowProps<D> {}
}
