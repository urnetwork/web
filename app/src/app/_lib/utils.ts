import { Timeseries, TimeseriesEntry } from "./types";

export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

/** Combine two arrays of the same length together into an array of 2-tuples.
 *
 * E.g. zip([a, b, c], [1, 2, 3]) = [(a, 1), (b, 2), (c, 3)]
 */
export function zip(a: Array<any>, b: Array<any>) {
  return a.map((k, i) => [k, b[i]]);
}

/**
 * Take timeseries data as it arrives from the API:
 * {
 *  "yyyy-mm-dd1": 0,
 *  "yyyy-mm-dd2": 0,
 * }
 *
 * and convert it into the format required by the charting library:
 * [
 *  {
 *     date: "yyyy-mm-dd",
 *     value: 0,
 *  },
 * ]
 *
 * This function also sorts the data chronologically by date.
 */
export function formatTimeseriesData(data: Timeseries): TimeseriesEntry[] {
  return Object.entries(data)
    .map(([key, value]) => ({
      date: key,
      value: value,
    }))
    .toSorted((a, b) => {
      const dateA = Date.parse(a.date);
      const dateB = Date.parse(b.date);

      if (dateA == dateB) {
        return 0;
      } else if (dateA > dateB) {
        return 1;
      } else {
        return -1;
      }
    });
}

/**
 * This function is from: https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
 */
export function prettyPrintByteCount(byteCount: number, decimals = 0) {
  if (!+byteCount) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    "Bytes",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];

  const i = Math.floor(Math.log(byteCount) / Math.log(k));

  return `${parseFloat((byteCount / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
