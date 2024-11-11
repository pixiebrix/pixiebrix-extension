// From https://github.com/mozilla/page-metadata-parser/issues/116#issuecomment-614882830
export type IPageMetadata = Record<string, string | string[]>;

export type PageMetadataRule = [
  string,
  (element: HTMLElement) => string | null,
];

export function getMetadata(
  doc: Document | HTMLElement,
  url: string,
  customRuleSets?: Record<string, PageMetadataRule>,
): IPageMetadata;
