/*
 * Copyright (C) 2022 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { range } from "lodash";
import React from "react";
import { Pagination as BootstrapPagination } from "react-bootstrap";

export const MAX_DISPLAYED_PAGES = 5;
const middlePageIndex = MAX_DISPLAYED_PAGES / 2;

const Pagination: React.FC<{
  page: number;
  setPage: (page: number) => void;
  numPages: number;
}> = ({ page, setPage, numPages }) => {
  let displayedNumbers: number[];
  let renderLeftEllipsis: boolean;
  let renderRightEllipsis: boolean;

  if (numPages <= MAX_DISPLAYED_PAGES) {
    displayedNumbers = range(numPages);
    renderLeftEllipsis = false;
    renderRightEllipsis = false;
  } else {
    renderLeftEllipsis = page > middlePageIndex;
    renderRightEllipsis = page < numPages - middlePageIndex - 1;

    let firstDisplayedPage = page - Math.floor(middlePageIndex);
    if (firstDisplayedPage < 0) {
      firstDisplayedPage = 0;
    } else if (firstDisplayedPage + MAX_DISPLAYED_PAGES > numPages) {
      firstDisplayedPage = numPages - MAX_DISPLAYED_PAGES;
    }

    displayedNumbers = range(
      firstDisplayedPage,
      firstDisplayedPage + MAX_DISPLAYED_PAGES
    );
  }

  const onMoreLeft = () => {
    let toPage = page - MAX_DISPLAYED_PAGES;
    if (toPage < middlePageIndex) {
      toPage = Math.floor(middlePageIndex);
    }

    setPage(toPage);
  };

  const onMoreRight = () => {
    let toPage = page + MAX_DISPLAYED_PAGES;
    if (toPage > numPages - middlePageIndex - 1) {
      toPage = Math.ceil(numPages - middlePageIndex - 1);
    }

    setPage(toPage);
  };

  return (
    <BootstrapPagination className="my-0">
      {renderLeftEllipsis && (
        <>
          <BootstrapPagination.First
            onClick={() => {
              setPage(0);
            }}
          />
          <BootstrapPagination.Ellipsis onClick={onMoreLeft} />
        </>
      )}
      {displayedNumbers.map((pageIndex) => (
        <BootstrapPagination.Item
          key={pageIndex}
          active={pageIndex === page}
          onClick={() => {
            setPage(pageIndex);
          }}
        >
          {pageIndex + 1}
        </BootstrapPagination.Item>
      ))}
      {renderRightEllipsis && (
        <>
          <BootstrapPagination.Ellipsis onClick={onMoreRight} />
          <BootstrapPagination.Last
            onClick={() => {
              setPage(numPages - 1);
            }}
          />
        </>
      )}
    </BootstrapPagination>
  );
};

export default Pagination;
