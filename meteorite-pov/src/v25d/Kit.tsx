import React from 'react';
import {AbsoluteFill} from 'remotion';

// Pixels per metre in world space, and CSS perspective distance (≈ 88° vertical FOV on 1920px)
export const M = 280;
export const P = 1000;
export const EYE = 1.6 * M; // ground sits this far below the eye

// Big surfaces are rasterised small and scaled up, so the browser never allocates huge layers
const MAX_TEX = 1200;
const shrink = (w: number, h: number) => Math.max(1, Math.max(w, h) / MAX_TEX);
const Inner: React.FC<{w: number; h: number; k: number; children: React.ReactNode; style?: React.CSSProperties}> = ({w, h, k, children, style}) => (
	<div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `scale(${1 / k})`, transformOrigin: '0 0', ...style}}>{children}</div>
);

export type Cam = {x: number; y: number; z: number; pitch: number; yaw: number; roll: number};

// A CSS-3D stage. The eye sits at cam.(x,y,z); things in front of it have smaller z.
export const Stage: React.FC<{cam: Cam; children: React.ReactNode; style?: React.CSSProperties}> = ({
	cam,
	children,
	style,
}) => (
	<AbsoluteFill style={{perspective: P, perspectiveOrigin: '50% 50%', overflow: 'hidden', ...style}}>
		<div
			style={{
				position: 'absolute',
				left: '50%',
				top: '50%',
				width: 0,
				height: 0,
				transformStyle: 'preserve-3d',
				transform: `translateZ(${P}px) rotateZ(${cam.roll}deg) rotateX(${cam.pitch}deg) rotateY(${cam.yaw}deg) translate3d(${-cam.x}px, ${-cam.y}px, ${-cam.z}px)`,
			}}
		>
			{children}
		</div>
	</AbsoluteFill>
);

// A flat billboard placed in the world. Size is given in world px.
// anchor "bottom" puts (x, y) at the bottom-centre (things standing on the ground).
export const Card: React.FC<{
	x?: number;
	y?: number;
	z: number;
	w: number;
	h: number;
	anchor?: 'center' | 'bottom';
	haze?: number;
	hazeColor?: string;
	rot?: number;
	scaleX?: number;
	opacity?: number;
	children: React.ReactNode;
}> = ({x = 0, y = 0, z, w, h, anchor = 'center', haze = 0, hazeColor = '#d9cbb6', rot = 0, scaleX = 1, opacity = 1, children}) => {
	const k = shrink(w, h);
	return (
		<div
			style={{
				position: 'absolute',
				left: -w / 2 / k,
				top: (anchor === 'bottom' ? -h : -h / 2) / k,
				width: w / k,
				height: h / k,
				transform: `translate3d(${x}px, ${y}px, ${z}px) rotate(${rot}deg) scale(${k * scaleX}, ${k})`,
				transformOrigin: anchor === 'bottom' ? '50% 100%' : '50% 50%',
				opacity,
			}}
		>
			<Inner w={w} h={h} k={k}>
				{children}
				{haze > 0 && <div style={{position: 'absolute', inset: 0, background: hazeColor, opacity: haze}} />}
			</Inner>
		</div>
	);
};

// A horizontal plane (floor / ground / ceiling) at height y, spanning z from zNear to zFar
export const Plane: React.FC<{
	y: number;
	zNear: number;
	zFar: number;
	x?: number;
	w: number;
	background: string;
	children?: React.ReactNode;
}> = ({y, zNear, zFar, x = 0, w, background, children}) => {
	const d = zNear - zFar;
	const k = shrink(w, d);
	return (
		<div
			style={{
				position: 'absolute',
				left: -w / 2 / k,
				top: -d / 2 / k,
				width: w / k,
				height: d / k,
				transform: `translate3d(${x}px, ${y}px, ${(zNear + zFar) / 2}px) rotateX(90deg) scale(${k})`,
			}}
		>
			<Inner w={w} h={d} k={k} style={{background}}>
				{children}
			</Inner>
		</div>
	);
};

// A vertical wall parallel to the z axis (corridor sides)
export const SideWall: React.FC<{
	x: number;
	yTop: number;
	yBottom: number;
	zNear: number;
	zFar: number;
	background: string;
	flip?: boolean;
	children?: React.ReactNode;
}> = ({x, yTop, yBottom, zNear, zFar, background, flip, children}) => {
	const d = zNear - zFar;
	const h = yBottom - yTop;
	const k = shrink(d, h);
	return (
		<div
			style={{
				position: 'absolute',
				left: -d / 2 / k,
				top: -h / 2 / k,
				width: d / k,
				height: h / k,
				transform: `translate3d(${x}px, ${(yTop + yBottom) / 2}px, ${(zNear + zFar) / 2}px) rotateY(${flip ? -90 : 90}deg) scale(${k})`,
			}}
		>
			<Inner w={d} h={h} k={k} style={{background}}>
				{children}
			</Inner>
		</div>
	);
};

// ---------- flat low-poly sprites ----------

export const Building: React.FC<{w: number; h: number; c: string; roof?: string; seed: number}> = ({w, h, c, roof, seed}) => {
	const cols = Math.max(2, Math.floor(w / 420));
	const rows = Math.max(2, Math.floor(h / 480));
	const ww = (w / cols) * 0.42;
	const wh = (h / rows) * 0.42;
	const roofH = roof ? w * 0.28 : 0;
	return (
		<svg width={w} height={h + roofH} viewBox={`0 ${-roofH} ${w} ${h + roofH}`} style={{position: 'absolute', bottom: 0, left: 0, overflow: 'visible'}}>
			{roof && <polygon points={`-10,0 ${w / 2},${-roofH} ${w + 10},0`} fill={roof} />}
			<rect x={0} y={0} width={w} height={h} fill={c} />
			<rect x={0} y={0} width={w * 0.12} height={h} fill="#000" opacity={0.08} />
			{Array.from({length: rows}).map((_, r) =>
				Array.from({length: cols}).map((__, k) => {
					const lit = ((seed * 31 + r * 7 + k * 13) % 11) === 0;
					return (
						<rect
							key={`${r}-${k}`}
							x={(k + 0.5) * (w / cols) - ww / 2}
							y={h - (r + 1) * (h / rows) + wh * 0.5}
							width={ww}
							height={wh}
							fill={lit ? '#e2a64c' : '#2f333a'}
						/>
					);
				}),
			)}
			<rect x={0} y={h - 26} width={w} height={26} fill="#000" opacity={0.15} />
		</svg>
	);
};

export const Tree: React.FC<{s?: number}> = ({s = 1}) => (
	<svg width={360 * s} height={900 * s} viewBox="0 0 360 900" style={{position: 'absolute', bottom: 0, left: 0}}>
		<polygon points="165,900 195,900 188,420 172,420" fill="#5a4433" />
		<polygon points="60,420 180,180 300,420 250,560 110,560" fill="#7f9a66" />
		<polygon points="180,180 300,420 250,560" fill="#6f8a5a" />
		<polygon points="90,330 180,60 270,330 180,420" fill="#88a46e" />
		<polygon points="180,60 270,330 180,420" fill="#77915e" />
	</svg>
);

export const Fence: React.FC<{w: number; gapFrom?: number; gapTo?: number}> = ({w, gapFrom = -1, gapTo = -1}) => {
	const n = Math.floor(w / 45);
	return (
		<svg width={w} height={260} viewBox={`0 0 ${w} 260`} style={{position: 'absolute', bottom: 0, left: 0}}>
			<rect x={0} y={90} width={w} height={18} fill="#e6dfd2" />
			<rect x={0} y={190} width={w} height={18} fill="#e6dfd2" />
			{Array.from({length: n}).map((_, i) => {
				const x = i * 45;
				if (x > gapFrom && x < gapTo) return null;
				return <polygon key={i} points={`${x},260 ${x},40 ${x + 13},20 ${x + 26},40 ${x + 26},260`} fill="#f1ece3" />;
			})}
		</svg>
	);
};

export const Car: React.FC<{c: string; w?: number}> = ({c, w = 1180}) => (
	<svg width={w} height={w * 0.36} viewBox="0 0 1180 420" style={{position: 'absolute', bottom: 0, left: 0}}>
		<polygon points="40,330 40,210 300,190 410,80 820,80 930,190 1140,215 1150,330" fill={c} />
		<polygon points="430,100 600,100 600,190 340,190" fill="#2e3a46" />
		<polygon points="620,100 800,100 900,190 620,190" fill="#2e3a46" />
		<rect x={40} y={300} width={1110} height={30} fill="#000" opacity={0.2} />
		<circle cx={270} cy={340} r={78} fill="#1d1d1f" />
		<circle cx={270} cy={340} r={32} fill="#9a9a9a" />
		<circle cx={910} cy={340} r={78} fill="#1d1d1f" />
		<circle cx={910} cy={340} r={32} fill="#9a9a9a" />
	</svg>
);

const SKIN = '#d9a07a';
const DRESS = '#7fa6cf';
const DRESS_D = '#6b90b8';
const HAIR = '#3a2a22';

// Mom, 460 world px tall (1.65m). pose: watering (side view) or turned towards us.
export const Mom: React.FC<{pose: 'side' | 'front'; look: number; arm: number; can?: boolean}> = ({pose, look, arm, can = true}) => (
	<svg width={220} height={470} viewBox="-110 -470 220 470" style={{position: 'absolute', bottom: 0, left: 0, overflow: 'visible'}}>
		<ellipse cx={0} cy={-4} rx={95} ry={14} fill="#000" opacity={0.18} />
		{pose === 'side' ? (
			<>
				<polygon points="-22,-150 -6,-150 -8,-14 -24,-14" fill={SKIN} />
				<polygon points="6,-150 22,-150 26,-14 10,-14" fill={SKIN} />
				<polygon points="-34,-14 -2,-14 -2,0 -38,0" fill="#eee" />
				<polygon points="6,-14 34,-14 36,0 4,0" fill="#eee" />
				<polygon points="-34,-310 30,-310 62,-140 -60,-140" fill={DRESS} />
				<polygon points="-34,-310 -4,-310 -18,-140 -60,-140" fill={DRESS_D} />
				<polygon points="-28,-360 28,-360 32,-300 -32,-300" fill={DRESS} />
				{/* arm reaching forward-left with the watering can */}
				<g transform={`rotate(${arm} -20 -350)`}>
					<polygon points="-26,-352 -12,-352 -64,-238 -78,-246" fill={SKIN} />
					<g transform="translate(-92,-238)" opacity={can ? 1 : 0}>
						<polygon points="-30,-26 26,-26 30,22 -34,22" fill="#4f8a6a" />
						<polygon points="-30,-14 -74,-44 -78,-36 -32,0" fill="#4f8a6a" />
						<path d="M -20 -26 Q 0 -60 20 -26" stroke="#3e7055" strokeWidth={7} fill="none" />
					</g>
				</g>
				<polygon points="-6,-380 8,-380 8,-356 -6,-356" fill={SKIN} />
				<g transform={`rotate(${-look} 0 -385)`}>
					<circle cx={0} cy={-418} r={38} fill={SKIN} />
					<path d="M -38 -418 Q -36 -462 4 -460 Q 40 -456 38 -420 L 20 -428 Q 0 -440 -10 -420 Z" fill={HAIR} />
					<circle cx={30} cy={-428} r={20} fill={HAIR} />
					<circle cx={-20} cy={-420} r={4.5} fill="#1b1411" />
					<polygon points="-38,-412 -46,-404 -36,-400" fill={SKIN} />
				</g>
			</>
		) : (
			<>
				<polygon points="-28,-150 -10,-150 -10,-14 -26,-14" fill={SKIN} />
				<polygon points="10,-150 28,-150 26,-14 10,-14" fill={SKIN} />
				<polygon points="-34,-14 -8,-14 -8,0 -36,0" fill="#eee" />
				<polygon points="8,-14 34,-14 36,0 8,0" fill="#eee" />
				<polygon points="-40,-310 40,-310 70,-140 -70,-140" fill={DRESS} />
				<polygon points="-40,-310 -10,-310 -30,-140 -70,-140" fill={DRESS_D} />
				<polygon points="-38,-362 38,-362 42,-300 -42,-300" fill={DRESS} />
				<polygon points="-38,-356 -26,-356 -40,-240 -52,-244" fill={SKIN} />
				{/* raised arm, reaching towards us */}
				<g transform={`rotate(${arm} 32 -352)`}>
					<polygon points="26,-356 40,-356 58,-240 44,-236" fill={SKIN} />
				</g>
				<polygon points="-8,-382 8,-382 8,-356 -8,-356" fill={SKIN} />
				<g transform={`rotate(0 0 -385)`}>
					<path d="M -44 -400 Q -46 -468 0 -466 Q 46 -468 44 -400 L 30 -410 L -30 -410 Z" fill={HAIR} />
					<circle cx={0} cy={-418} r={38} fill={SKIN} />
					<path d="M -38 -424 Q -34 -464 0 -462 Q 34 -464 38 -424 Q 10 -446 -38 -424 Z" fill={HAIR} />
					<circle cx={-14} cy={-418} r={4.5} fill="#1b1411" />
					<circle cx={14} cy={-418} r={4.5} fill="#1b1411" />
					<polygon points="-18,-432 -8,-428 -20,-426" fill="#1b1411" />
					<polygon points="18,-432 8,-428 20,-426" fill="#1b1411" />
					<ellipse cx={0} cy={-396} rx={7} ry={9} fill="#5a2a22" />
				</g>
			</>
		)}
	</svg>
);

// First-person hands drawn in screen space
const HSKIN = '#e0a982';
const HSKIN_D = '#c98e69';
const SLEEVE = '#2c3e5a';
const SLEEVE_D = '#22324a';

export const HandOpen: React.FC<{mirror?: boolean}> = ({mirror}) => (
	<svg width={360} height={720} viewBox="0 0 360 720" style={{transform: mirror ? 'scaleX(-1)' : undefined, overflow: 'visible'}}>
		<polygon points="70,720 290,720 270,330 100,330" fill={SLEEVE} />
		<polygon points="70,720 140,720 130,330 100,330" fill={SLEEVE_D} />
		<polygon points="92,350 278,350 270,300 100,300" fill={SLEEVE_D} />
		<polygon points="108,300 262,300 272,170 112,180" fill={HSKIN} />
		{[0, 1, 2, 3].map((i) => (
			<polygon
				key={i}
				points={`${118 + i * 38},190 ${148 + i * 38},190 ${146 + i * 38},${70 + (i === 1 || i === 2 ? 0 : 20)} ${122 + i * 38},${70 + (i === 1 || i === 2 ? 0 : 20)}`}
				fill={i % 2 ? HSKIN_D : HSKIN}
			/>
		))}
		<polygon points="262,250 300,200 330,150 312,138 270,190 256,220" fill={HSKIN} />
	</svg>
);

export const HandFist: React.FC<{mirror?: boolean}> = ({mirror}) => (
	<svg width={360} height={720} viewBox="0 0 360 720" style={{transform: mirror ? 'scaleX(-1)' : undefined, overflow: 'visible'}}>
		<polygon points="70,720 290,720 270,330 100,330" fill={SLEEVE} />
		<polygon points="70,720 140,720 130,330 100,330" fill={SLEEVE_D} />
		<polygon points="92,350 278,350 270,300 100,300" fill={SLEEVE_D} />
		<polygon points="100,310 270,310 282,190 250,150 120,150 92,200" fill={HSKIN} />
		{[0, 1, 2, 3].map((i) => (
			<polygon key={i} points={`${122 + i * 38},152 ${158 + i * 38},152 ${156 + i * 38},196 ${122 + i * 38},196`} fill={HSKIN_D} opacity={0.6} />
		))}
		<polygon points="260,260 300,230 296,200 262,210" fill={HSKIN_D} />
	</svg>
);

export const Glow: React.FC<{size: number; color: string; core?: string}> = ({size, color, core}) => (
	<div
		style={{
			position: 'absolute',
			left: 0,
			top: 0,
			width: size,
			height: size,
			borderRadius: '50%',
			background: `radial-gradient(circle, ${core ?? color} 0%, ${color} 25%, rgba(0,0,0,0) 70%)`,
		}}
	/>
);
