// Code pulled from https://github.com/davidhu2000/react-spinners/blob/main/src/PulseLoader.tsx
// with some modifications to make it tailwind-appropriate.

import * as React from "react";

const createAnimation = (
  loaderName: string,
  frames: string,
  suffix: string
): string => {
  const animationName = `react-spinners-${loaderName}-${suffix}`;

  if (typeof window == "undefined" || !window.document) {
    return animationName;
  }

  const styleEl = document.createElement("style");
  document.head.appendChild(styleEl);
  const styleSheet = styleEl.sheet;

  const keyFrames = `
      @keyframes ${animationName} {
        ${frames}
      }
    `;

  if (styleSheet) {
    styleSheet.insertRule(keyFrames, 0);
  }

  return animationName;
};

const pulse = createAnimation(
  "PulseLoader",
  "0% {transform: scale(1); opacity: 1} 45% {transform: scale(0.1); opacity: 0.7} 80% {transform: scale(1); opacity: 1}",
  "pulse"
);

function PulseLoader({ className }): JSX.Element | null {
  const style = (i: number): React.CSSProperties => {
    return {
      animation: `${pulse} ${1.5}s ${
        i * 0.2
      }s infinite cubic-bezier(0.2, 0.68, 0.18, 1.08)`,
      animationFillMode: "both",
    };
  };

  const dotClassName = "bg-[#2B3A82] w-5 h-5 mx-1 rounded-full inline-block";

  return (
    <div className={className}>
      <span className={dotClassName} style={style(1)} />
      <span className={dotClassName} style={style(2)} />
      <span className={dotClassName} style={style(3)} />
    </div>
  );
}

export default PulseLoader;
