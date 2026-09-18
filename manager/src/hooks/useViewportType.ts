import { useEffect, useRef, useState } from "react";

export enum ViewportType {
  Desktop,
  Mobile,
}

export const useViewportType = () => {
  const [type, setType] = useState<ViewportType>(ViewportType.Desktop);
  const initialSetRef = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    const onChange = (event: MediaQueryListEvent) => {
      const newType = event.matches
        ? ViewportType.Mobile
        : ViewportType.Desktop;

      if (type !== newType) {
        setType(newType);
      }
    };

    if (!initialSetRef.current) {
      const initType = query.matches
        ? ViewportType.Mobile
        : ViewportType.Desktop;

      if (type !== initType) {
        setType(initType);
      }

      initialSetRef.current = true;
    }
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [type]);

  useEffect(() => {
    console.debug("Viewport type changed: %s", ViewportType[type]);
  }, [type]);

  return type;
};
