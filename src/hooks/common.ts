import { useState, useMemo } from "react";
import useAsyncEffect from "use-async-effect";
import isPromise from "is-promise";

type StateFactory<T> = Promise<T> | (() => Promise<T>);

export function useAsyncState<T>(
  promiseFactory: StateFactory<T>
): [T | undefined, boolean] {
  const promise = useMemo(() => {
    const maybePromise =
      typeof promiseFactory === "function" ? promiseFactory() : promiseFactory;
    if (!isPromise(maybePromise)) {
      throw new Error("useAsyncState expects a promise of promise factory");
    }
    return maybePromise;
  }, [promiseFactory]);
  const [result, setResult] = useState(undefined);
  const [isPending, setPending] = useState(true);
  useAsyncEffect(async (isMounted) => {
    setPending(true);
    try {
      const promiseResult = await promise;
      if (!isMounted()) return;
      setResult(promiseResult);
    } finally {
      if (isMounted()) {
        setPending(false);
      }
    }
  }, []);
  return [result, isPending];
}
