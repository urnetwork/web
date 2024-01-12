import { zip } from "@/app/_lib/utils";
import moment from "moment";
import { useEffect, useRef, useState } from "react";

type UptimeWidgetProps = {
  data: {
    event_time: string;
    connected: boolean;
  }[];
};

type UptimeSegment = {
  start_string: string;
  end_string: string;
  start_date: number;
  end_date: number;
  connected: boolean;
};

export default function UptimeWidget({ data }: UptimeWidgetProps) {
  // Scale factor to convert between dates, and pixel widths
  const [scaleFactor, setScaleFactor] = useState<number>();
  const [svgWidth, setSvgWidth] = useState<number>();
  const [svgHeight, setSvgHeight] = useState<number>();
  const [tooltipSegment, setTooltipSegment] = useState<UptimeSegment>();
  const [showNullTooltip, setShowNullTooltip] = useState(false);

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
      setSvgWidth(width);
      setScaleFactor(width / (lastEntry.end_date - firstEntry.start_date));
    }
    setSvgHeight(divRef.current?.clientHeight);
  }, []);

  if (!data || data.length == 0) {
    return (
      <div
        className="h-full w-full relative bg-gray-200 cursor-pointer"
        onMouseEnter={() => setShowNullTooltip(true)}
        onMouseLeave={() => setShowNullTooltip(false)}
      >
        <div
          id="tooltip"
          className={`
            ${showNullTooltip ? "absolute" : "hidden"}
            z-20 bg-gray-600 text-gray-100 border border-gray-800 p-2 rounded-md
          `}
          style={{
            bottom: (svgHeight || 16) + 2,
            left: 0,
          }}
        >
          <div className="text-xs flex flex-col gap-1">
            <p>No uptime data found.</p>
          </div>
        </div>
      </div>
    );
  }

  const showTooltip = (segment: UptimeSegment) => {
    setTooltipSegment(segment);
  };
  const hideTooltip = () => {
    setTooltipSegment(undefined);
  };

  return (
    <div className="relative h-full w-full" ref={divRef}>
      {tooltipSegment && scaleFactor && (
        <div
          id="tooltip"
          className={
            "absolute z-20 bg-gray-600 text-gray-100 border border-gray-800 p-2 rounded-md"
          }
          style={{
            bottom: (svgHeight || 16) + 2,
            left: Math.min(
              (tooltipSegment.start_date - firstEntry.start_date) * scaleFactor,
              (svgWidth || 180) - 180
            ),
          }}
        >
          {tooltipSegment && (
            <div className="text-xs flex flex-col gap-1">
              <p>
                {moment(tooltipSegment.start_string).format("YYYY-MM-DD H:mm")}
                {" - "}
                {moment(tooltipSegment.end_string).format("H:mm")}
              </p>
              {tooltipSegment.connected && (
                <p>
                  Connected for{" "}
                  {moment(tooltipSegment.end_string).diff(
                    moment(tooltipSegment.start_string),
                    "minutes"
                  )}{" "}
                  minutes.
                </p>
              )}
              {!tooltipSegment.connected && (
                <p>
                  Disconnected for{" "}
                  {moment(tooltipSegment.end_string).diff(
                    moment(tooltipSegment.start_string),
                    "minutes"
                  )}{" "}
                  minutes.
                </p>
              )}
            </div>
          )}
        </div>
      )}
      <svg height="100%" width="100%">
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
              onMouseEnter={() => showTooltip(segment)}
              onMouseLeave={() => hideTooltip()}
            />
          ))}
      </svg>
    </div>
  );
}
