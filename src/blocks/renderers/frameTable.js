// import { v4 as uuidv4 } from "uuid";
// import { Renderer } from "@/types";
// import { faTable } from "@fortawesome/free-solid-svg-icons";
// import { messageBackgroundScript } from "@/chrome";
// import { FORWARD_FRAME_DATA } from "@/messaging/constants";
// import { registerBlock } from "@/blocks/registry";
//
// export class FrameTable extends Renderer {
//   constructor() {
//     super(
//       "pixiebrix/contrib-datatables-net",
//       "NOT IMPLEMENTED - an interactive datatable in a frame",
//       "An interactive datatable using https://www.datatables.net/",
//       faTable
//     );
//   }
//
//   inputSpec() {
//     return {
//       // columns: {
//       //     type: "array",
//       //     description: "Column labels and values to show",
//       //     items: {
//       //         type: "object",
//       //         properties: {
//       //             label: { type: "string" },
//       //             property: { type: "string" },
//       //             href: { type: "string" },
//       //         },
//       //         required: ["label", "property"],
//       //     },
//       //     minItems: 1,
//       // },
//     };
//   }
//
//   async render({ columns }, { ctxt }) {
//     // https://transitory.technology/browser-extensions-and-csp-headers/
//     const src = chrome.extension.getURL("frame.html");
//
//     const id = uuidv4();
//
//     await messageBackgroundScript(FORWARD_FRAME_DATA, {
//       id,
//       columns,
//       ctxt,
//     });
//
//     const target = "http://127.0.0.1:8000/api/datatable/";
//     return `
//     <iframe
//         src="${src}?id=${id}&url=${encodeURIComponent(target)}"
//         title="DataTable" style="border:none;"
//         sandbox="allow-scripts allow-same-origin">
//     </iframe>
//     `;
//   }
// }
//
// // registerBlock(new FrameTable());
