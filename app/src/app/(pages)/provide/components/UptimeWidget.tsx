import { zip } from "@/app/_lib/utils";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

type UptimeWidgetProps = {
  data: {
    event_time: string;
    connected: boolean;
  }[];
};

export default function UptimeWidget({ data }: UptimeWidgetProps) {
  if (!data || data.length == 0) {
    return <div className="h-4 w-32 bg-gray-200" />;
  }

  // Scale factor to convert between dates, and pixel widths
  const [scaleFactor, setScaleFactor] = useState<number>();

  const divRef = useRef<HTMLDivElement>(null);
  const segments = zip(
    data.slice(0, data.length - 1),
    data.slice(1, data.length)
  ).map(([start, end]) => {
    return {
      start_string: start.event_time,
      end_string: end.event_time,
      start_date: Date.parse(start.event_time),
      end_date: Date.parse(end.event_time),
      connected: start.connected,
    };
  });

  const firstEntry = segments[0];
  const lastEntry = segments.slice(-1)[0];

  useEffect(() => {
    const width = divRef.current?.clientWidth;
    if (width) {
      setScaleFactor(width / (lastEntry.end_date - firstEntry.start_date));
    }
  }, []);

  return (
    <div className="h-4 w-32" ref={divRef}>
      <svg height="100%">
        {scaleFactor &&
          segments.map((segment) => (
            <rect
              className="hover:stroke-slate-300 cursor-pointer"
              x={(segment.start_date - firstEntry.start_date) * scaleFactor}
              y="0"
              width={(segment.end_date - segment.start_date) * scaleFactor}
              height="100%"
              fill={segment.connected ? "#1D3150" : "#e5e7eb"}
              strokeWidth={2}
            />
          ))}
      </svg>
    </div>
  );

  <div className="h-4 w-32 bg-primary" />;
}
