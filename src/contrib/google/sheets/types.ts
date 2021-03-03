export interface SheetMeta {
  id: string;
  name: string;
}

export interface Doc extends SheetMeta {
  serviceId: "spread" | string;
  mimeType: "application/vnd.google-apps.spreadsheet" | string;
}

export interface Data {
  action: string;
  docs: Doc[];
}
