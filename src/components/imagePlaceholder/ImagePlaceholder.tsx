/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import React, { useEffect, useRef } from "react";
import { run as runHolder } from "holderjs";
import { Image } from "react-bootstrap";

const ImagePlaceholder: React.VoidFunctionComponent<{
  height: number | string;
  width: number | string;
}> = ({ height, width }) => {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    runHolder({
      images: imageRef.current,
    });
  }, [height, width]);

  // https://github.com/imsky/holder/issues/225#issuecomment-770261030
  return (
    <Image
      alt="Placeholder"
      ref={imageRef}
      src={`holder.js/${width}x${height}`}
    />
  );
};

export default ImagePlaceholder;
