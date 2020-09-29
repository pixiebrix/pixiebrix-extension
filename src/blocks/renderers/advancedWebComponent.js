// import { Renderer } from "@/types";
//
// export class AdvancedWebComponentRenderer extends Renderer {
//   constructor() {
//     super(
//       "pixiebrix/contrib-systemjs-html",
//       "BROKEN - dynamically loaded web component",
//       "Render a web component with one or more external dependencies"
//     );
//   }
//
//   inputSpec() {
//     return {};
//   }
//
//   async render({ components = [], template }, { ctxt }) {
//     const importMap = document.createElement("script");
//     importMap.type = "module";
//     importMap.innerHTML = `
//             import 'https://cdn.jsdelivr.net/npm/leaflet@1.6.0/dist/leaflet-src.esm.js';
//             import 'https://cdn.jsdelivr.net/npm/@clevercloud/components@3.0.2/dist/maps/cc-map.js';
//         `;
//     (document.head || document.documentElement).appendChild(importMap);
//
//     return `<cc-map>My legend</cc-map>`;
//   }
// }
