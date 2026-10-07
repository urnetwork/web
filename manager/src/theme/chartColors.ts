// URnetwork brand colors for Chart.js — keep in sync with tailwind.config.js
// (source of truth: urnetwork/elements src/index.css).
export const urChart = {
	// Vivid on-dark accents for data series
	series: {
		green: '#87fb67',
		yellowLight: '#eff7bb',
		blueLight: '#d6e6f4',
		pink: '#ed8fff',
		coral: '#ff6c58',
	},
	/** 12.5%-alpha fill matching a series line color */
	fill: (hex: string) => hex + '20',
	grid: '#282828',
	ticks: '#909090',
	legend: '#b7b7b7',
	tooltipBg: '#212121',
	tooltipTitle: '#f8f8f8',
	tooltipBody: '#b7b7b7',
	tooltipBorder: '#282828',
	pointBorder: '#101010',
	fontFamily: "'PpNeueMontrealRegular', system-ui, -apple-system, sans-serif",
} as const;
