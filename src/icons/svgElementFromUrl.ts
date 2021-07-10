export default async function fetchSVG(
  src: string
): Promise<JQuery<SVGElement>> {
  const response = await fetch(src);
  const svg = await response.text();
  // There might also be comment nodes, so they need to be filtered out
  return $<SVGElement>(svg).filter("svg");
}
