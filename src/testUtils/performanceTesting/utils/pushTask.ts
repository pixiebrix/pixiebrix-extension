export const pushTask = (callback: () => void) => {
  process.nextTick(callback);
};
