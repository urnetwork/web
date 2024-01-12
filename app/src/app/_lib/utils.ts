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
