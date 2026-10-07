import React from 'react';

// Pixel-style icons traced from urnetwork/elements (Streamline Pixel set,
// licensed via the elements design system). Same props shape as lucide-react.
interface UrIconProps {
	size?: number;
	className?: string;
	title?: string;
}

const NETWORK_INSTABILITY_PATHS = [
	'M30.47 16.005H32v6.09h-1.53Z',
	'M28.95 22.095h1.52v1.53h-1.52Z',
	'M28.95 14.475h1.52v1.53h-1.52Z',
	'M27.43 23.625h1.52v1.52h-1.52Z',
	'M27.43 12.955h1.52v1.52h-1.52Z',
	'M3.05 25.145h24.38v1.52H3.05Z',
	'M24.38 11.435h3.05v1.52h-3.05Z',
	'M22.85 9.905h1.53v1.53h-1.53Z',
	'M21.33 17.525h1.52v1.52h-1.52Z',
	'M21.33 14.475h1.52v1.53h-1.52Z',
	'M21.33 8.385h1.52v1.52h-1.52Z',
	'M19.81 16.005h1.52v1.52h-1.52Z',
	'M18.28 17.525h1.53v1.52h-1.53Z',
	'M18.28 14.475h1.53v1.53h-1.53Z',
	'M18.28 6.855h3.05v1.53h-3.05Z',
	'm13.71 22.095 3.05 0 0 1.53 3.05 0 0 -3.05 -6.1 0 0 1.52z',
	'M13.71 5.335h4.57v1.52h-4.57Z',
	'M12.19 17.525h1.52v1.52h-1.52Z',
	'M12.19 14.475h1.52v1.53h-1.52Z',
	'M10.66 6.855h3.05v1.53h-3.05Z',
	'M10.66 16.005h1.53v1.52h-1.53Z',
	'M9.14 17.525h1.52v1.52H9.14Z',
	'M9.14 14.475h1.52v1.53H9.14Z',
	'M9.14 8.385h1.52v1.52H9.14Z',
	'M7.62 9.905h1.52v3.05H7.62Z',
	'M3.05 12.955h4.57v1.52H3.05Z',
	'M1.52 23.625h1.53v1.52H1.52Z',
	'M1.52 14.475h1.53v1.53H1.52Z',
	'M0 16.005h1.52v7.62H0Z',
];

const PRIVACY_PATHS = [
	'M27.425 4.57h1.53v16.76h-1.53Z',
	'M25.905 21.33h1.52v3.05h-1.52Z',
	'M24.385 24.38h1.52v1.53h-1.52Z',
	'M24.385 3.05h3.04v1.52h-3.04Z',
	'M22.855 25.91h1.53v1.52h-1.53Z',
	'M22.855 13.71h1.53v9.15h-1.53Z',
	'M21.335 27.43h1.52v1.52h-1.52Z',
	'M21.335 22.86h1.52v1.52h-1.52Z',
	'M21.335 1.52h3.05v1.53h-3.05Z',
	'M18.285 28.95h3.05v1.53h-3.05Z',
	'M10.665 24.38h10.67v1.53h-10.67Z',
	'm18.285 18.29 -1.52 0 0 -1.53 -1.53 0 0 -1.52 -1.52 0 0 1.52 -1.52 0 0 3.05 1.52 0 0 1.52 1.52 0 0 1.53 1.53 0 0 -1.53 1.52 0 0 -1.52 1.53 0 0 -3.05 -1.53 0 0 1.53z',
	'M18.285 4.57h1.53V6.1h-1.53Z',
	'M16.765 15.24h1.52v1.52h-1.52Z',
	'M13.715 30.48h4.57V32h-4.57Z',
	'M13.715 3.05h4.57v1.52h-4.57Z',
	'M10.665 28.95h3.05v1.53h-3.05Z',
	'M12.195 4.57h1.52V6.1h-1.52Z',
	'M10.665 0h10.67v1.52h-10.67Z',
	'm22.855 13.71 0 -1.52 -1.52 0 0 -6.09 -1.52 0 0 6.09 -7.62 0 0 -6.09 -1.53 0 0 6.09 -1.52 0 0 1.52 13.71 0z',
	'M9.145 27.43h1.52v1.52h-1.52Z',
	'M9.145 22.86h1.52v1.52h-1.52Z',
	'M7.625 1.52h3.04v1.53h-3.04Z',
	'M7.625 25.91h1.52v1.52h-1.52Z',
	'M7.625 13.71h1.52v9.15h-1.52Z',
	'M6.095 24.38h1.53v1.53h-1.53Z',
	'M4.575 3.05h3.05v1.52h-3.05Z',
	'M4.575 21.33h1.52v3.05h-1.52Z',
	'M3.045 4.57h1.53v16.76h-1.53Z',
];

const UrIcon: React.FC<UrIconProps & { paths: string[] }> = ({
	size = 16,
	className,
	title,
	paths,
}) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 32 32"
		width={size}
		height={size}
		className={className}
		aria-hidden={title ? undefined : true}
		role={title ? 'img' : 'presentation'}
	>
		{title && <title>{title}</title>}
		{paths.map((d) => (
			<path key={d} d={d} fill="currentColor" />
		))}
	</svg>
);

/** Cloud-error pixel icon — marks providers/locations with unstable connections */
export const IconNetworkInstability: React.FC<UrIconProps> = (props) => (
	<UrIcon {...props} paths={NETWORK_INSTABILITY_PATHS} />
);

/** Lock-shield pixel icon — marks locations with strong privacy laws */
export const IconPrivacy: React.FC<UrIconProps> = (props) => (
	<UrIcon {...props} paths={PRIVACY_PATHS} />
);
