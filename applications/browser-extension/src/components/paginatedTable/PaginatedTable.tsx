// We need to import regenerator-runtime to fix an error. See the following
// for more details: -
// https://flaviocopes.com/parcel-regeneratorruntime-not-defined/ -
// https://github.com/tannerlinsley/react-table/issues/2071
import "regenerator-runtime/runtime";
import React, { useEffect, useState, type CSSProperties } from "react";
import {
  useTable,
  usePagination,
  type Column,
  useSortBy,
  useAsyncDebounce,
  useGlobalFilter,
  type FilterValue,
  useFlexLayout,
  useResizeColumns,
  type Row,
} from "react-table";
import { useLocation, useHistory } from "react-router";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Pagination, Table, Form } from "react-bootstrap";
import { type History, type Location } from "history";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCaretDown,
  faCaretUp,
  faSort,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./PaginatedTable.module.scss";
import { isFunction } from "lodash";

type Action = (...args: unknown[]) => void;
type RowProps = {
  className?: string;
  onClick?: (...args: unknown[]) => void;
  style?: CSSProperties | undefined;
};
interface TableProps<
  Row extends UnknownObject,
  Actions extends Record<string, Action>,
> {
  data: Row[];
  columns: Array<Column<Row>>;
  actions?: Actions;
  initialPageSize?: number;
  rowProps?: (row: UnknownObject) => RowProps;
  showSearchFilter: boolean;

  /**
   * Force the table to show a specific record. This can be a function that returns true for the record to show, or
   * the record itself.
   */
  forceShowRecord?: Row | ((x: Row) => boolean);

  /**
   * Track pagination in the URL `page` query parameter. WARNING: opt-in, because if there are multiple multi-page
   * tables mounted, this will cause an infinite history loop.
   */
  syncURL?: boolean;
}

const SearchFilter: React.FunctionComponent<{
  setGlobalFilter: (filterValue: FilterValue) => void;
  style?: CSSProperties;
}> = ({ setGlobalFilter: setFilter, style }) => {
  const [value, setValue] = useState("");
  const onChange = useAsyncDebounce((value) => {
    setFilter(value || undefined);
  }, 200);

  return (
    <Form.Control
      size="sm"
      type="text"
      placeholder="Filter records..."
      value={value ?? ""}
      style={style}
      onChange={({ target }) => {
        setValue(target.value);
        onChange(target.value);
      }}
    />
  );
};

function readPageIndex(location: Location): number {
  // The search params are 1-indexed, but the pageIndex is 0-indexed. Default to the first page
  const value =
    Number.parseInt(
      new URLSearchParams(location.search).get("page") ?? "1",
      10,
    ) - 1;
  return Number.isNaN(value) || value < 0 ? 0 : value;
}

function setSearchParams(
  location: Location,
  history: History,
  update: Record<string, string>,
) {
  const params = new URLSearchParams(location.search);
  for (const [param, value] of Object.entries(update)) {
    params.set(param, value);
  }

  history.replace({
    pathname: location.pathname,
    search: params.toString(),
  });
}

function findPageIndex<TRow extends UnknownObject>({
  record,
  rows,
  pageSize,
}: {
  record: unknown;
  rows: Array<Row<TRow>>;
  pageSize: number;
}): number | null {
  const predicate = isFunction(record) ? record : (x: unknown) => x === record;

  const index = rows.findIndex((row) => predicate(row.original));

  if (index >= 0) {
    return Math.floor(index / pageSize);
  }

  return null;
}

/**
 * A paginated table with sorting, resizing, and global filtering.
 * TODO: This component is not fully accessible - it needs keyboard navigation support.
 */
function PaginatedTable<
  Row extends UnknownObject,
  Actions extends Record<string, Action> = Record<string, Action>,
>({
  data,
  columns,
  actions = {} as Actions,
  initialPageSize = 10,
  syncURL = false,
  rowProps,
  showSearchFilter,
  forceShowRecord,
}: TableProps<Row, Actions>): React.ReactElement {
  const history = useHistory();
  const location = useLocation();
  const urlPageIndex = readPageIndex(location);
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    pageCount,
    gotoPage,
    state: { pageIndex, pageSize },
    prepareRow,
    setGlobalFilter,
    rows,
  } = useTable<Row>(
    {
      columns,
      data,
      initialState: {
        pageIndex: urlPageIndex,
        pageSize: initialPageSize,
      },
      actions,
    },
    useGlobalFilter,
    useSortBy,
    usePagination,
    useResizeColumns,
    useFlexLayout,
  );

  const rowNumber = rows.length > 0 ? pageIndex * pageSize + 1 : 0; // Show 0 for empty table

  useEffect(() => {
    if (Number.isNaN(pageIndex) || pageIndex < 0) {
      gotoPage(0);
    } else if (pageIndex >= pageCount) {
      gotoPage(pageCount - 1);
    } else if (pageIndex !== urlPageIndex && syncURL) {
      // Page has changed, so sync the URL with the current page
      setSearchParams(location, history, {
        page: String(pageIndex + 1),
      });
    }
  }, [
    pageIndex,
    history,
    location,
    pageCount,
    gotoPage,
    urlPageIndex,
    syncURL,
  ]);

  useEffect(() => {
    if (forceShowRecord && rows) {
      const index = findPageIndex({ record: forceShowRecord, pageSize, rows });
      if (index != null) {
        gotoPage(index);
      }
    }
  }, [forceShowRecord, gotoPage, pageSize, rows]);

  // TODO: This component should be reviewed because it has several instances of d-block and w-100,
  // which "break" the table and seem to do nothing. Also the CSS seems to suggest that some
  // headers/footers should be sticky but they aren't
  return (
    <Table {...getTableProps()} responsive className={styles.paginatedTable}>
      <thead className="d-block w-100">
        {headerGroups.map((headerGroup) => (
          // eslint-disable-next-line react/jsx-key -- handled by getHeaderGroupProps
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map((column, index) => (
              // eslint-disable-next-line react/jsx-key -- handled by getHeaderProps
              <th
                {...column.getHeaderProps(column.getSortByToggleProps())}
                className={styles.th}
              >
                <div className="header-content d-flex">
                  {column.render("Header")}
                  {column.canSort && (
                    <span className="text-muted ml-2">
                      {column.isSorted ? (
                        column.isSortedDesc ? (
                          <FontAwesomeIcon
                            icon={faCaretDown}
                            className={styles.sortIcon}
                          />
                        ) : (
                          <FontAwesomeIcon
                            icon={faCaretUp}
                            className={styles.sortIcon}
                          />
                        )
                      ) : (
                        <FontAwesomeIcon
                          icon={faSort}
                          className={styles.sortIcon}
                        />
                      )}
                    </span>
                  )}
                </div>
                {column.canResize &&
                index !== headerGroup.headers.length - 1 ? (
                  <>
                    {column?.isResizing && <div className={styles.overlay} />}
                    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                    -- TODO: implement keyboard accessible column resizing */}
                    <div
                      className={styles.resize}
                      {...column.getResizerProps()}
                      onClick={(event) => {
                        // Support the whole header cell as the sort toggle target
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                    />
                  </>
                ) : (
                  ""
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody {...getTableBodyProps()} className="d-block w-100">
        {page.map((row) => {
          prepareRow(row);
          return (
            // eslint-disable-next-line react/jsx-key -- handled by getRowProps
            <tr
              {...row.getRowProps(
                rowProps ? rowProps(row.original) : undefined,
              )}
            >
              {row.cells.map((cell) => (
                // eslint-disable-next-line react/jsx-key -- handled by getCellProps?
                <td {...cell.getCellProps()} className={styles.td}>
                  {cell.render("Cell")}
                </td>
              ))}
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={5} className="text-muted">
              No records found.
            </td>
          </tr>
        )}
      </tbody>
      <tfoot className={styles.tfoot}>
        <tr className="d-block w-100">
          <td className="d-flex align-items-center justify-content-between w-100">
            <div className="text-muted">
              Showing {rowNumber} to{" "}
              {Math.min(rowNumber + pageSize - 1, rows.length)} of {rows.length}
            </div>
            <div className="flex-grow-1 px-3">
              {showSearchFilter && (
                <SearchFilter
                  style={{ maxWidth: 300 }}
                  setGlobalFilter={setGlobalFilter}
                />
              )}
            </div>

            <Pagination className="m-0">
              <Pagination.First
                onClick={() => {
                  gotoPage(0);
                }}
                disabled={!canPreviousPage}
              />
              <Pagination.Prev
                onClick={previousPage}
                disabled={!canPreviousPage}
              />
              <Pagination.Item disabled>
                Page {pageIndex + 1} of {pageCount === 0 ? 1 : pageCount}
              </Pagination.Item>
              <Pagination.Next onClick={nextPage} disabled={!canNextPage} />
              <Pagination.Last
                onClick={() => {
                  gotoPage(pageCount - 1);
                }}
                disabled={!canNextPage}
              />
            </Pagination>
          </td>
        </tr>
      </tfoot>
    </Table>
  );
}

export default PaginatedTable;
