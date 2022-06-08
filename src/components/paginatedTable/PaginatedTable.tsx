// We need to import regenerator-runtime to fix an error. See the following
// for more details: -
// https://flaviocopes.com/parcel-regeneratorruntime-not-defined/ -
// https://github.com/tannerlinsley/react-table/issues/2071
import "regenerator-runtime/runtime";
import React, { useEffect, useState, CSSProperties } from "react";
import {
  useTable,
  usePagination,
  Column,
  useSortBy,
  useAsyncDebounce,
  useGlobalFilter,
  FilterValue,
  useFlexLayout,
  useResizeColumns,
} from "react-table";
import { useLocation, useHistory } from "react-router";
import { Pagination, Table, Form } from "react-bootstrap";
import { History, Location } from "history";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCaretDown,
  faCaretUp,
  faSort,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./PaginatedTable.module.scss";

type Action = (...args: unknown[]) => void;
type RowProps = {
  className?: string;
  onClick?: (...args: unknown[]) => void;
  style?: CSSProperties | undefined;
};
interface TableProps<
  Row extends Record<string, unknown>,
  Actions extends Record<string, Action>
> {
  data: Row[];
  columns: Array<Column<Row>>;
  actions: Actions;
  initialPageSize?: number;
  rowProps?: (row: Record<string, unknown>) => RowProps;

  /**
   * Track pagination in the URL `page` query parameter. WARNING: opt-in, because if there are multiple multi-page
   * tables mounted, this will cause an infinite history loop.
   */
  syncURL?: boolean;
}

const SearchFilter: React.FunctionComponent<{
  setGlobalFilter: (filterValue: FilterValue) => void;
}> = ({ setGlobalFilter: setFilter }) => {
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
      10
    ) - 1;
  return Number.isNaN(value) || value < 0 ? 0 : value;
}

function setSearchParams(
  location: Location,
  history: History,
  update: Record<string, string>
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

export const CommaListCell: React.VoidFunctionComponent<{
  links: React.ReactNode[];
}> = ({ links }) => (
  <p>
    {(links ?? []).map((link, index) => (
      <React.Fragment key={index}>
        {index > 0 && ", "}
        {link}
      </React.Fragment>
    ))}
  </p>
);
export const TruncatedCell: React.VoidFunctionComponent<{
  children: React.ReactNode;
}> = ({ children }) => <div className={styles.truncatedCell}>{children}</div>;

function PaginatedTable<
  Row extends Record<string, unknown>,
  Actions extends Record<string, Action>
>({
  data,
  columns,
  actions,
  initialPageSize = 10,
  syncURL = false,
  rowProps,
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
    useFlexLayout
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
  }, [pageIndex, history, location, pageCount, gotoPage, urlPageIndex]);

  return (
    <>
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
                      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
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
              <tr {...row.getRowProps(rowProps(row.original) ?? undefined)}>
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
            <td className="d-block w-100">
              <div className="d-flex align-items-center">
                <div className="text-muted">
                  Showing {rowNumber} to{" "}
                  {Math.min(rowNumber + pageSize - 1, rows.length)} of{" "}
                  {rows.length}
                </div>

                <div className="flex-grow-1 px-3">
                  <div style={{ maxWidth: 300 }}>
                    <SearchFilter setGlobalFilter={setGlobalFilter} />
                  </div>
                </div>

                <div>
                  <Pagination className="m-0 float-right">
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
                    <Pagination.Next
                      onClick={nextPage}
                      disabled={!canNextPage}
                    />
                    <Pagination.Last
                      onClick={() => {
                        gotoPage(pageCount - 1);
                      }}
                      disabled={!canNextPage}
                    />
                  </Pagination>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </Table>
    </>
  );
}

export default PaginatedTable;
