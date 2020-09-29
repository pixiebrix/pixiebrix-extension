// https://stackoverflow.com/questions/43638454/webpack-typescript-image-import
declare module "*.svg" {
  const value: any;
  export default value;
}
