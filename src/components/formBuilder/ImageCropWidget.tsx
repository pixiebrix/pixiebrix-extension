/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useRef, useState } from "react";
import ReactCrop, { Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { FormGroup, FormLabel } from "react-bootstrap";
import { WidgetProps } from "@rjsf/core";
import styles from "./ImageCropWidget.module.scss";

const ImageCropWidget: React.VFC<WidgetProps> = ({
  schema,
  onChange,
  uiSchema,
}) => {
  const [crop, setCrop] = useState<Partial<Crop>>({
    unit: "%",
    width: 30,
    height: 50,
  });

  const [croppedImageUrl, setCroppedImageUrl] = useState<string>();

  const imageRef = useRef<HTMLImageElement>();
  const onImageLoaded = (image: HTMLImageElement) => {
    imageRef.current = image;
  };

  const onCropChange = (crop: Crop) => {
    setCrop(crop);
  };

  const onCropComplete = (crop: Crop) => {
    makeClientCrop(crop);
  };

  const makeClientCrop = (crop: Crop) => {
    if (imageRef && crop.width && crop.height) {
      const croppedImage = getCroppedImg(imageRef.current, crop);
      setCroppedImageUrl(croppedImage);
      onChange(croppedImage);
    }
  };

  const getCroppedImg = (image: HTMLImageElement, crop: Crop) => {
    const canvas = document.createElement("canvas");
    const pixelRatio = window.devicePixelRatio;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const canvasContext = canvas.getContext("2d");

    canvas.width = crop.width * pixelRatio * scaleX;
    canvas.height = crop.height * pixelRatio * scaleY;

    canvasContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    canvasContext.imageSmoothingQuality = "high";

    canvasContext.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );

    return canvas.toDataURL("image/jpeg");
  };

  const source: string | null =
    typeof uiSchema?.source === "string" ? uiSchema.source : null;

  return (
    <FormGroup>
      <FormLabel>{schema.title}</FormLabel>
      {source && (
        <ReactCrop
          src={source}
          crop={crop}
          onImageLoaded={onImageLoaded}
          onComplete={onCropComplete}
          onChange={onCropChange}
        />
      )}
      {croppedImageUrl && (
        <>
          <div className="text-muted form-text">Preview</div>
          <img
            alt="Crop preview"
            className={styles.preview}
            src={croppedImageUrl}
          />
        </>
      )}
    </FormGroup>
  );
};

export default ImageCropWidget;
