import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {IMPACT, clamp01, lin, sm} from '../timeline';
import {
	Building,
	Cam,
	Car,
	Card,
	EYE,
	Fence,
	Glow,
	HandFist,
	HandOpen,

	Mom,
	P,
	Plane,
	SideWall,
	Stage,
	Tree,
} from './Kit';

// ---------------- world layout (px, z negative = further from the house) ----------------
const MOM = {x: -200, z: -1400};
const IMP = {x: 150, y: EYE - 60, z: -3300};
const MSTART = {x: -9000, y: -26000, z: -60000};
const FOG = '#d9cbb6';

type V = {x: number; y: number; z: number};

const meteorT = (f: number) => Math.pow(clamp01((f - 12) / (IMPACT - 12)), 1.7);
const meteorAt = (t: number): V => ({
	x: MSTART.x + (IMP.x - MSTART.x) * t,
	y: MSTART.y + (IMP.y - MSTART.y) * t,
	z: MSTART.z + (IMP.z - MSTART.z) * t,
});
const heat = (f: number) => (f >= IMPACT ? 1 : Math.pow(meteorT(f), 2.2));

const hazeAt = (z: number) => clamp01(1 - Math.exp(-Math.abs(z) / 14000)) * 0.9;

const noise = (f: number, s: number) =>
	Math.sin(f * 1.7 + s) * 0.5 + Math.sin(f * 3.1 + s * 2.3) * 0.3 + Math.sin(f * 5.9 + s * 4.1) * 0.2;

// yaw / pitch (deg) needed to look from eye to target
const lookAt = (eye: V, t: V) => {
	const dx = t.x - eye.x;
	const dy = t.y - eye.y;
	const dz = t.z - eye.z;
	return {
		yaw: (Math.atan2(dx, -dz) * 180) / Math.PI,
		pitch: (Math.atan2(-dy, Math.hypot(dx, dz)) * 180) / Math.PI,
	};
};
const mixLook = (a: {yaw: number; pitch: number}, b: {yaw: number; pitch: number}, w: number) => ({
	yaw: a.yaw + (b.yaw - a.yaw) * w,
	pitch: a.pitch + (b.pitch - a.pitch) * w,
});

const project = (p: V, cam: Cam) => {
	const d = Math.max(1, cam.z - p.z);
	return {x: ((p.x - cam.x) * P) / d, y: ((p.y - cam.y) * P) / d};
};

// ---------------- the street seen from the house ----------------
const Outside: React.FC<{f: number; cam: Cam; momVisible: boolean; momTurn: number}> = ({f, cam, momVisible, momTurn}) => {
	const h = heat(f);
	const a = f - IMPACT;
	const houses = [
		{x: -3600, w: 2200, h: 2600, c: '#b8735a'},
		{x: -1300, w: 2000, h: 1700, c: '#d8cbb3', roof: '#6d4c3d'},
		{x: 900, w: 2300, h: 3100, c: '#c9c3b8'},
		{x: 3300, w: 2100, h: 1800, c: '#a9b6b9', roof: '#53473f'},
		{x: 5600, w: 2300, h: 2700, c: '#b4836b'},
		{x: -5900, w: 2100, h: 2200, c: '#d3c6ad'},
	];
	const skyTop = `rgb(${165 - 30 * h}, ${150 - 70 * h}, ${140 - 80 * h})`;
	const skyHor = `rgb(${227 + 10 * h}, ${211 - 60 * h}, ${188 - 110 * h})`;
	return (
		<>
			{/* sky */}
			<Card z={-90000} w={210000} h={210000}>
				<div style={{width: '100%', height: '100%', background: `linear-gradient(${skyTop} 0%, ${skyHor} 50%, #b9ad9b 50.5%, #b9ad9b 100%)`}} />
			</Card>
			{/* skyline */}
			{Array.from({length: 16}).map((_, i) => {
				const hh = 4000 + random(`sk${i}`) * 9000;
				return (
					<Card key={i} x={-26000 + i * 3500} y={EYE} z={-20000 - random(`sz${i}`) * 4000} w={2600} h={hh} anchor="bottom" haze={0.82} hazeColor={FOG}>
						<div style={{width: '100%', height: '100%', background: '#a99f93'}} />
					</Card>
				);
			})}
			{/* ground */}
			<Plane y={EYE} zNear={-6000} zFar={-45000} w={110000} background="#b2a690" />
			<Plane
				y={EYE}
				zNear={300}
				zFar={-6000}
				w={16000}
				background="linear-gradient(#c4beb4 0%, #c4beb4 6.7%, #5d5c5c 6.7%, #5d5c5c 31.7%, #c4beb4 31.7%, #c4beb4 35%, #8a9466 35%, #8f9a69 100%)"
			>
				{/* path from the door to the street */}
				<div style={{position: 'absolute', left: 8000 + 250 - 180, top: 2100, width: 360, height: 4200, background: '#bdb3a5'}} />
				{/* lane marks */}
				{Array.from({length: 14}).map((_, i) => (
					<div key={i} style={{position: 'absolute', left: i * 1200, top: 1140, width: 520, height: 40, background: '#e9e4d6'}} />
				))}
				{/* house shadow */}
				<div style={{position: 'absolute', left: 0, top: 5900, width: 16000, height: 400, background: 'rgba(40,30,20,0.18)'}} />
				{f >= IMPACT && (
					<div
						style={{
							position: 'absolute',
							left: 8000 + IMP.x - 900,
							top: 6300 + IMP.z - 600,
							width: 1800,
							height: 1200,
							borderRadius: '50%',
							background: 'radial-gradient(#140d09 0%, #2b211a 55%, rgba(43,33,26,0) 72%)',
						}}
					/>
				)}
				{f >= IMPACT && a < 22 && (
					<div
						style={{
							position: 'absolute',
							left: 8000 + IMP.x - a * 260,
							top: 6300 + IMP.z - a * 260,
							width: a * 520,
							height: a * 520,
							borderRadius: '50%',
							border: `${80 + a * 6}px solid rgba(255,238,205,${0.75 - a / 30})`,
							boxSizing: 'border-box',
						}}
					/>
				)}
			</Plane>
			{/* houses across the street */}
			{houses.map((b, i) => (
				<Card key={i} x={b.x} y={EYE} z={-6700} w={b.w} h={b.h + (b.roof ? b.w * 0.28 : 0)} anchor="bottom" haze={hazeAt(-6700) + h * 0.05} hazeColor={FOG}>
					<Building w={b.w} h={b.h} c={b.c} roof={b.roof} seed={i + 3} />
				</Card>
			))}
			{/* parked cars */}
			<Card x={2300} y={EYE} z={-5300} w={1180} h={425} anchor="bottom" haze={hazeAt(-5300)}>
				<Car c="#5a6a78" />
			</Card>
			<Card x={-1900} y={EYE} z={-4450} w={1180} h={425} anchor="bottom" haze={hazeAt(-4450)}>
				<Car c="#7b3f33" />
			</Card>
			{/* street trees + lamps */}
			{[-3200, -1200, 2000, 4300].map((x, i) => (
				<Card key={i} x={x} y={EYE} z={-4000} w={360 * 1.3} h={900 * 1.3} anchor="bottom" haze={hazeAt(-4000)}>
					<Tree s={1.3} />
				</Card>
			))}
			{[-2400, 1300, 5000].map((x) => (
				<Card key={x} x={x} y={EYE} z={-4020} w={160} h={1250} anchor="bottom" haze={hazeAt(-4020)}>
					<svg width={160} height={1250} viewBox="0 0 160 1250">
						<rect x={70} y={40} width={20} height={1210} fill="#3a3a3c" />
						<rect x={20} y={30} width={120} height={22} fill="#3a3a3c" />
						<rect x={10} y={50} width={60} height={18} fill="#e9e4cf" />
					</svg>
				</Card>
			))}
			{/* fence + mailbox */}
			<Card x={0} y={EYE} z={-3900} w={9000} h={260} anchor="bottom" haze={hazeAt(-3900)}>
				<Fence w={9000} gapFrom={4500 + 250 - 230} gapTo={4500 + 250 + 230} />
			</Card>
			<Card x={620} y={EYE} z={-3800} w={120} h={330} anchor="bottom" haze={hazeAt(-3800)}>
				<svg width={120} height={330} viewBox="0 0 120 330">
					<rect x={52} y={80} width={16} height={250} fill="#3d3430" />
					<rect x={10} y={20} width={100} height={80} rx={30} fill="#3e5f8a" />
				</svg>
			</Card>
			{/* yard trees */}
			<Card x={-1700} y={EYE} z={-1100} w={360} h={900} anchor="bottom">
				<Tree />
			</Card>
			<Card x={1900} y={EYE} z={-2700} w={430} h={1080} anchor="bottom" haze={hazeAt(-2700)}>
				<Tree s={1.2} />
			</Card>
			{/* flower bed */}
			<Card x={-560} y={EYE} z={-1330} w={460} h={110} anchor="bottom">
				<svg width={460} height={110} viewBox="0 0 460 110">
					<rect x={0} y={60} width={460} height={50} fill="#5d4330" />
					{Array.from({length: 9}).map((_, i) => (
						<g key={i}>
							<rect x={22 + i * 50} y={30} width={6} height={34} fill="#5c7a4a" />
							<polygon
								points={`${10 + i * 50},30 ${25 + i * 50},10 ${40 + i * 50},30 ${25 + i * 50},44`}
								fill={['#d9566b', '#f2c14e', '#e98a3f', '#c95fa8'][i % 4]}
							/>
						</g>
					))}
				</svg>
			</Card>
			{momVisible && (
				<Card x={MOM.x} y={EYE} z={MOM.z} w={220} h={470} anchor="bottom" scaleX={momTurn < 0.5 ? 1 - momTurn * 2 : (momTurn - 0.5) * 2}>
					<Mom
						pose={momTurn < 0.5 ? 'side' : 'front'}
						can={f <= 162}
						look={sm(f, [
							[130, 0],
							[150, 32],
						])}
						arm={momTurn < 0.5 ? sm(f, [[150, 0], [162, 30]]) : sm(f, [[226, 0], [238, -150]])}
					/>
				</Card>
			)}
			{/* dropped watering can */}
			{f > 162 && f < IMPACT && (
				<Card x={MOM.x - 150} y={EYE} z={MOM.z + 60} w={90} h={60} anchor="bottom" rot={70}>
					<div style={{width: '100%', height: '100%', background: '#4f8a6a'}} />
				</Card>
			)}
			<Meteor f={f} cam={cam} />
			<ImpactFx f={f} />
		</>
	);
};

const Meteor: React.FC<{f: number; cam: Cam}> = ({f, cam}) => {
	if (f < 12 || f >= IMPACT) return null;
	const t = meteorT(f);
	const p = meteorAt(t);
	const dist = cam.z - p.z;
	const size = Math.max(1700, dist * 0.07);
	const back = meteorAt(Math.max(0, t - 0.02));
	const s0 = project(p, cam);
	const s1 = project(back, cam);
	const ang = (Math.atan2(-(s1.x - s0.x), s1.y - s0.y) * 180) / Math.PI;
	const puffs = 34;
	return (
		<>
			{/* smoke contrail */}
			{Array.from({length: puffs}).map((_, i) => {
				const tt = (i / puffs) * t;
				const age = t - tt;
				const q = meteorAt(tt);
				const d = cam.z - q.z;
				const s = Math.max(1200, d * 0.045) * (1 + age * 3.5);
				return (
					<Card key={i} x={q.x + Math.sin(i * 1.3) * age * 1500} y={q.y - age * 2500} z={q.z} w={s} h={s} opacity={0.5 * (1 - age)}>
						<div style={{width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,226,216,0.95) 0%, rgba(232,226,216,0) 68%)'}} />
					</Card>
				);
			})}
			<Card x={p.x} y={p.y} z={p.z} w={size * 10} h={size * 10}>
				<div style={{position: 'absolute', inset: 0, transform: `rotate(${ang}deg)`}}>
					{/* fire tail, extending away from the direction of travel */}
					<div
						style={{
							position: 'absolute',
							left: '50%',
							top: '50%',
							width: size * 0.9,
							height: size * 4.8,
							marginLeft: -size * 0.45,
							borderRadius: `${size}px ${size}px ${size * 0.2}px ${size * 0.2}px`,
							background: 'linear-gradient(rgba(255,236,170,1) 0%, rgba(255,140,50,0.85) 25%, rgba(255,80,20,0.4) 60%, rgba(120,60,40,0) 100%)',
							filter: `blur(${size * 0.04}px)`,
						}}
					/>
				</div>
				<div style={{position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%,-50%)`}}>
					<div style={{position: 'relative', width: size * 3, height: size * 3, transform: 'translate(-50%,-50%)', left: '50%', top: '50%'}}>
						<Glow size={size * 3} color="rgba(255,110,40,0.45)" />
					</div>
				</div>
				<div
					style={{
						position: 'absolute',
						left: '50%',
						top: '50%',
						width: size * 1.6,
						height: size * 1.6,
						marginLeft: -size * 0.8,
						marginTop: -size * 0.8,
						borderRadius: '50%',
						background: 'radial-gradient(circle, #fffbe8 0%, #ffd27a 30%, rgba(255,120,40,0.7) 55%, rgba(255,90,30,0) 72%)',
					}}
				/>
				<svg
					width={size * 0.3}
					height={size * 0.3}
					viewBox="-10 -10 20 20"
					style={{position: 'absolute', left: '50%', top: '50%', marginLeft: -size * 0.15, marginTop: -size * 0.15, transform: `rotate(${f * 9}deg)`}}
				>
					<polygon points="-9,-3 -4,-9 5,-8 9,-1 6,7 -3,9 -9,4" fill="#6a2c14" />
					<polygon points="-4,-9 5,-8 9,-1 1,0" fill="#ff7a2a" opacity={0.8} />
				</svg>
			</Card>
		</>
	);
};

const DUST = Array.from({length: 46}).map((_, i) => ({
	ang: random(`da${i}`) * Math.PI * 2,
	sp: 0.5 + random(`ds${i}`) * 0.8,
	size: 700 + random(`dz${i}`) * 1100,
	up: random(`du${i}`),
	c: ['#8a7a68', '#9c8d7c', '#6f6256', '#a89a87'][i % 4],
}));
const DEBRIS = Array.from({length: 36}).map((_, i) => ({
	ang: random(`ba${i}`) * Math.PI * 2,
	sp: 900 + random(`bs${i}`) * 2200,
	vy: 1500 + random(`bv${i}`) * 3500,
	size: 50 + random(`bz${i}`) * 140,
	rot: random(`br${i}`) * 40 - 20,
	c: ['#5b4d42', '#3a302a', '#7a6b5c'][i % 3],
}));
const FIRES = Array.from({length: 5}).map((_, i) => ({
	x: IMP.x + (random(`fx${i}`) - 0.5) * 2600,
	z: IMP.z + (random(`fz${i}`) - 0.5) * 1400,
	s: 0.45 + random(`fs${i}`) * 0.4,
}));

const ImpactFx: React.FC<{f: number}> = ({f}) => {
	if (f < IMPACT) return null;
	const a = f - IMPACT;
	const fb = 400 + 7000 * (1 - Math.exp(-a / 4));
	return (
		<>
			{/* smoke column */}
			{Array.from({length: 16}).map((_, i) => {
				const born = i * 1.4;
				if (a < born) return null;
				const age = a - born;
				const s = 1300 + age * 40 + i * 70;
				return (
					<Card key={`s${i}`} x={IMP.x + Math.sin(i * 2.1) * 400} y={EYE - 900 - age * 90 - i * 160} z={IMP.z - 300} w={s} h={s}>
						<div
							style={{
								width: '100%',
								height: '100%',
								borderRadius: '50%',
								background: `radial-gradient(circle, rgba(${60 + Math.max(0, 140 - age * 12)},${50 + Math.max(0, 50 - age * 5)},40,0.95) 0%, rgba(55,46,40,0.9) 45%, rgba(55,46,40,0) 70%)`,
							}}
						/>
					</Card>
				);
			})}
			{/* fireball */}
			<Card x={IMP.x} y={EYE - fb * 0.3} z={IMP.z} w={fb} h={fb} opacity={clamp01(1 - a / 26)}>
				<div
					style={{
						width: '100%',
						height: '100%',
						borderRadius: '50%',
						background: 'radial-gradient(circle, #fffbe6 0%, #ffd37a 25%, #ff7a2a 48%, rgba(255,80,20,0) 70%)',
					}}
				/>
			</Card>
			{/* debris */}
			{DEBRIS.map((d, i) => {
				const t = a / 30;
				const y = EYE - 80 - d.vy * t + 0.5 * 9000 * t * t;
				const landed = y > EYE - d.size / 2;
				return (
					<Card
						key={`b${i}`}
						x={IMP.x + Math.cos(d.ang) * d.sp * t * 3}
						y={landed ? EYE : y}
						z={IMP.z + Math.sin(d.ang) * d.sp * t * 3}
						w={d.size}
						h={d.size * 0.7}
						anchor="bottom"
						rot={landed ? d.rot : d.rot * a}
					>
						<svg width="100%" height="100%" viewBox="0 0 10 7" preserveAspectRatio="none">
							<polygon points="0,7 1,1 6,0 10,3 9,7" fill={d.c} />
						</svg>
					</Card>
				);
			})}
			{/* dust wall */}
			{DUST.map((d, i) => {
				const r = 2600 * d.sp * (1 - Math.exp(-a / 8));
				const s = d.size * (0.6 + Math.min(1, a * 0.04));
				return (
					<Card
						key={`d${i}`}
						x={IMP.x + Math.cos(d.ang) * r * 1.4}
						y={EYE + s * 0.15 - d.up * 500 - a * 6}
						z={IMP.z + Math.sin(d.ang) * r * 0.6}
						w={s}
						h={s}
						anchor="bottom"
						opacity={clamp01(0.85 - a / 140)}
					>
						<div style={{width: '100%', height: '100%', borderRadius: '50%', background: `radial-gradient(circle, ${d.c} 0%, ${d.c} 35%, rgba(0,0,0,0) 70%)`}} />
					</Card>
				);
			})}
			{/* fires */}
			{FIRES.map((fi, i) => {
				const g = clamp01((a - 3 - i) / 8);
				if (g <= 0) return null;
				const fl = 1 + Math.sin(a * 1.4 + i * 2) * 0.15 + Math.sin(a * 2.9 + i) * 0.08;
				return (
					<Card key={`f${i}`} x={fi.x} y={EYE} z={fi.z} w={260 * fi.s} h={420 * fi.s * g * fl} anchor="bottom">
						<svg width="100%" height="100%" viewBox="0 0 26 42" preserveAspectRatio="none">
							<polygon points="0,42 4,20 9,26 13,0 17,22 22,14 26,42" fill="#ff7a1a" />
							<polygon points="6,42 9,28 13,12 17,30 20,42" fill="#ffd36a" />
						</svg>
					</Card>
				);
			})}
		</>
	);
};

// ---------------- the window (scene 1) ----------------
const WindowWall: React.FC = () => {
	const W = 1400;
	const H = 1600;
	const cx = W / 2;
	const cy = H / 2;
	const hx0 = cx - 160;
	const hx1 = cx + 160;
	const hy0 = cy - 300;
	const hy1 = cy + 200;
	return (
		<>
			<Card z={0} w={W} h={H}>
				<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
					<path
						fillRule="evenodd"
						d={`M0 0 H${W} V${H} H0 Z M${hx0} ${hy0} H${hx1} V${hy1} H${hx0} Z`}
						fill="#d8cbb3"
					/>
					{/* frame */}
					<path fillRule="evenodd" d={`M${hx0 - 26} ${hy0 - 26} H${hx1 + 26} V${hy1 + 10} H${hx0 - 26} Z M${hx0} ${hy0} H${hx1} V${hy1} H${hx0} Z`} fill="#efe9dd" />
					<rect x={hx0} y={cy - 110} width={hx1 - hx0} height={12} fill="#efe9dd" />
				</svg>
			</Card>
			{/* window reveal: sill + jambs give real depth */}
			<Plane y={200} zNear={70} zFar={-40} w={380} background="linear-gradient(#e4ddd0, #f3eee6)" />
			<SideWall x={-160} yTop={-300} yBottom={200} zNear={0} zFar={-40} background="#e9e2d5" />
			<SideWall x={160} yTop={-300} yBottom={200} zNear={0} zFar={-40} background="#d9d1c3" flip />
			{/* glass */}
			<Card z={-38} w={320} h={500} y={-50}>
				<div style={{width: '100%', height: '100%', background: 'linear-gradient(125deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.13) 38%, rgba(255,255,255,0) 46%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0) 64%)'}} />
			</Card>
			{/* curtains */}
			{[-1, 1].map((s) => (
				<Card key={s} x={s * 225} y={-60} z={50} w={150} h={800}>
					<svg width={150} height={800} viewBox="0 0 150 800">
						<rect width={150} height={800} fill="#7d8f8a" />
						{[20, 60, 100].map((x) => (
							<rect key={x} x={x} width={18} height={800} fill="#6c7d78" />
						))}
					</svg>
				</Card>
			))}
		</>
	);
};

// ---------------- the hallway (scene 2) ----------------
const Hallway: React.FC<{f: number}> = ({f}) => {
	const door = sm(f, [
		[174, 0],
		[186, 100],
	]);
	const zEnd = -1900;
	const frames = [
		{z: -400, side: -1, c: '#7a8f6b'},
		{z: -900, side: 1, c: '#b4766a'},
		{z: -1300, side: -1, c: '#6f7f9c'},
		{z: -1500, side: 1, c: '#c8a24a'},
	];
	return (
		<>
			{/* light from outside behind the door */}
			<Card z={zEnd - 30} y={100} w={900} h={1200}>
				<div style={{width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 60%, #fff4e0 0%, #f2d7b0 40%, #e0a46e 100%)'}} />
			</Card>
			<Plane y={EYE} zNear={300} zFar={zEnd} w={400} background="repeating-linear-gradient(90deg, #7a5638 0px, #7a5638 76px, #5e412a 76px, #5e412a 80px)" />
			<Plane y={-260} zNear={300} zFar={zEnd} w={400} background="#ece6da">
				{[0.3, 0.7].map((t) => (
					<div key={t} style={{position: 'absolute', left: 100, top: `${t * 100}%`, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(#fff3d6 0%, rgba(255,240,210,0) 70%)'}} />
				))}
			</Plane>
			<SideWall x={-200} yTop={-260} yBottom={EYE} zNear={300} zFar={zEnd} background="linear-gradient(#d8cbb3 75%, #c9b9a0 75%, #c9b9a0 77%, #d2c4ab 77%)" />
			<SideWall x={200} yTop={-260} yBottom={EYE} zNear={300} zFar={zEnd} background="linear-gradient(#cfc1a8 75%, #bfae95 75%, #bfae95 77%, #c8b9a0 77%)" flip />
			{frames.map((fr, i) => (
				<SideWall
					key={i}
					x={fr.side * 196}
					yTop={-150}
					yBottom={20}
					zNear={fr.z + 110}
					zFar={fr.z - 110}
					background={`linear-gradient(${fr.c}, ${fr.c})`}
					flip={fr.side > 0}
				>
					<div style={{position: 'absolute', inset: 0, border: '16px solid #3a2d24'}} />
				</SideWall>
			))}
			{/* end wall with doorway */}
			<Card z={zEnd} y={(EYE - 260) / 2} w={400} h={EYE + 260}>
				<svg width={400} height={EYE + 260} viewBox={`0 0 400 ${EYE + 260}`}>
					<path fillRule="evenodd" d={`M0 0 H400 V${EYE + 260} H0 Z M60 110 H340 V${EYE + 260} H60 Z`} fill="#d8cbb3" />
					<path fillRule="evenodd" d={`M44 94 H356 V${EYE + 260} H44 Z M60 110 H340 V${EYE + 260} H60 Z`} fill="#efe9dd" />
				</svg>
			</Card>
			{/* door panel, hinged on the left, swinging outwards */}
			<div
				style={{
					position: 'absolute',
					left: -140,
					top: -150,
					width: 280,
					height: EYE + 150,
					transformOrigin: '0 50%',
					transform: `translate3d(0px, 0px, ${zEnd - 2}px) rotateY(${door}deg)`,
					background: '#6b3d2a',
				}}
			>
				<div style={{position: 'absolute', left: 40, top: 50, width: 200, height: 200, background: '#5a3222'}} />
				<div style={{position: 'absolute', left: 40, top: 320, width: 200, height: 200, background: '#5a3222'}} />
				<div style={{position: 'absolute', right: 26, top: 300, width: 22, height: 22, borderRadius: '50%', background: '#c9a650'}} />
			</div>
		</>
	);
};

// ---------------- composition ----------------
export const Meteorite25D: React.FC = () => {
	const f = useCurrentFrame();
	const h = heat(f);
	const a = f - IMPACT;
	const shake = f >= IMPACT ? 9 * Math.exp(-a / 6) + 0.4 : 0.15 + 2.2 * Math.pow(h, 1.5);
	const sh = {yaw: noise(f, 1) * shake, pitch: noise(f, 7) * shake, roll: noise(f, 3) * shake * 0.6};

	// --- scene 1: window ---
	const winEye: V = {x: 0, y: 0, z: 300};
	const toMom = lookAt(winEye, {x: MOM.x, y: EYE - 230, z: MOM.z});
	const toMet = lookAt(winEye, meteorAt(meteorT(f)));
	const wWin = sm(f, [
		[0, 0],
		[28, 0],
		[48, 0.95],
		[66, 0.95],
		[84, 0.05],
	]);
	const lw = mixLook(toMom, toMet, wWin);
	const bang = f > 82 ? Math.max(0, Math.sin((f - 82) * 0.9)) : 0;
	const whip = sm(f, [
		[96, 0],
		[110, 1],
	]);
	const winCam: Cam = {
		x: Math.sin(f * 0.05) * 6,
		y: 0,
		z: 300 - bang * 25,
		yaw: lw.yaw + whip * 75 + sh.yaw,
		pitch: lw.pitch + sh.pitch,
		roll: sh.roll,
	};

	// --- scene 2: hallway ---
	const running = (fr: number) => fr > 106 && fr < 247 && !(fr > 172 && fr < 186);
	const bob = running(f) ? Math.abs(Math.sin(f * 0.5)) * 16 - 6 : 0;
	const sway = running(f) ? Math.sin(f * 0.25) : 0;
	const hallZ = lin(f, [
		[100, 250],
		[172, -1350],
		[184, -1450],
		[194, -1950],
	]);
	const hallCam: Cam = {
		x: sway * 10,
		y: bob,
		z: hallZ,
		yaw: (1 - sm(f, [[100, 0], [112, 1]])) * -70 + sh.yaw,
		pitch: -2 + sh.pitch,
		roll: sway * 1.3 + sh.roll,
	};

	// --- scene 3+4: outside, then thrown to the ground ---
	const outEye: V = {
		x: lin(f, [
			[190, 250],
			[242, 120],
		]),
		y: bob,
		z: lin(f, [
			[190, -150],
			[242, -700],
			[250, -720],
		]),
	};
	const oMom = lookAt(outEye, {x: MOM.x, y: EYE - 260, z: MOM.z});
	const oMet = lookAt(outEye, meteorAt(meteorT(Math.min(f, IMPACT - 1))));
	const lo = mixLook(
		oMom,
		oMet,
		sm(f, [
			[196, 0.15],
			[222, 0.35],
			[246, 0.6],
		]),
	);
	let outCam: Cam = {x: outEye.x + sway * 10, y: outEye.y, z: outEye.z, yaw: lo.yaw + sh.yaw, pitch: lo.pitch + sh.pitch, roll: sway * 1.3 + sh.roll};
	if (f >= IMPACT) {
		const s = clamp01(a / 13);
		const k = 1 - Math.pow(1 - s, 3);
		const breathe = clamp01((a - 14) / 10) * Math.sin(a * 0.12);
		const ground = lookAt({x: 300, y: EYE - 70, z: -420}, {x: IMP.x, y: EYE - 250, z: IMP.z});
		outCam = {
			x: 120 + (300 - 120) * k,
			y: (EYE - 70) * k - Math.sin(s * Math.PI) * 120,
			z: -720 + (300 * k),
			yaw: lo.yaw + (ground.yaw - lo.yaw) * k + sh.yaw,
			pitch: lo.pitch + (ground.pitch - lo.pitch) * k + sh.pitch + breathe * 1.5,
			roll: -68 * k - Math.sin(s * Math.PI) * 25 + sh.roll,
		};
	}
	const momTurn = sm(f, [
		[216, 0],
		[226, 1],
	]);

	const scene = f < 104 ? 'window' : f < 192 ? 'hall' : 'out';
	const hallIn = clamp01((f - 100) / 8);
	const whiteDoor = sm(f, [
		[182, 0],
		[191, 1],
		[192, 1],
		[200, 0],
	]);

	// blur & grade
	const whipBlur = sm(f, [
		[96, 0],
		[103, 10],
		[112, 0],
	]);
	const impactBlur = f >= IMPACT ? 12 * Math.exp(-a / 6) + 1.5 + Math.max(0, Math.sin(a * 0.25)) * 1.5 : 0;
	const flash = f >= IMPACT ? clamp01(1 - (a - 2) / 10) : 0;
	const tunnel = f >= IMPACT ? clamp01((a - 6) / 12) : 0;
	const lids = sm(f, [
		[266, 0],
		[271, 0.55],
		[277, 0.1],
		[286, 0.25],
		[297, 1],
	]);
	const black = sm(f, [
		[290, 0],
		[299, 1],
	]);
	const grade = `sepia(${0.12 + h * 0.2}) saturate(${f >= IMPACT ? 0.65 : 0.95}) contrast(1.05)`;

	return (
		<AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
			<AbsoluteFill style={{filter: `blur(${(whipBlur + impactBlur).toFixed(2)}px) ${grade}`, transform: `scale(${1.04 + (f >= IMPACT ? 0.05 * Math.exp(-a / 8) : 0)})`}}>
				{scene === 'window' && (
					<Stage cam={winCam}>
						<Outside f={f} cam={winCam} momVisible momTurn={0} />
						<WindowWall />
					</Stage>
				)}
				{f >= 100 && f < 192 && (
					<Stage cam={hallCam} style={{opacity: scene === 'window' ? hallIn : 1}}>
						<Hallway f={f} />
					</Stage>
				)}
				{scene === 'out' && (
					<Stage cam={outCam}>
						<Outside f={f} cam={outCam} momVisible={f <= IMPACT} momTurn={momTurn} />
					</Stage>
				)}
			</AbsoluteFill>
			<Hands f={f} roll={outCam.roll} />
			<Ash f={f} amount={f >= IMPACT ? 1 : h > 0.5 ? (h - 0.5) * 0.8 : 0} />
			{/* meteor heat */}
			<AbsoluteFill
				style={{
					background: 'radial-gradient(circle at 40% 20%, rgba(255,140,60,0.6), rgba(255,90,30,0) 65%)',
					opacity: f < IMPACT && scene !== 'hall' ? h * 0.85 : 0,
					mixBlendMode: 'screen',
				}}
			/>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(20,10,5,0.55) 100%)'}} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse 60% 48% at 50% 48%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.96) 100%)', opacity: tunnel}} />
			<AbsoluteFill style={{backgroundColor: '#fff6e6', opacity: Math.max(flash, whiteDoor * 0.9)}} />
			<div style={{position: 'absolute', left: 0, right: 0, top: 0, height: `${lids * 51}%`, background: '#000', borderBottomLeftRadius: '50% 30%', borderBottomRightRadius: '50% 30%'}} />
			<div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: `${lids * 51}%`, background: '#000', borderTopLeftRadius: '50% 30%', borderTopRightRadius: '50% 30%'}} />
			<AbsoluteFill style={{backgroundColor: '#000', opacity: black}} />
		</AbsoluteFill>
	);
};

// ---------------- first-person hands (screen space) ----------------
const Hands: React.FC<{f: number; roll: number}> = ({f, roll}) => {
	const place = (x: number, y: number, rot: number, s: number, child: React.ReactNode, key: string) => (
		<div key={key} style={{position: 'absolute', left: x - 180, top: y, width: 360, height: 720, transform: `rotate(${rot}deg) scale(${s})`, transformOrigin: '50% 100%'}}>
			{child}
		</div>
	);

	if (f < 104) {
		const lift = sm(f, [
			[74, 0],
			[84, 1],
		]);
		const bang = f > 82 ? Math.max(0, Math.sin((f - 82) * 0.9)) : 0;
		const out = sm(f, [
			[96, 0],
			[104, 1],
		]);
		const y = 1380 - lift * 200 - bang * 120 + out * 700;
		const s = 1 - bang * 0.12;
		const Comp = lift > 0.5 ? HandFist : HandOpen;
		return (
			<AbsoluteFill>
				{place(300, y, 12, s, <Comp />, 'l')}
				{place(780, y + 20, -12, s, <Comp mirror />, 'r')}
			</AbsoluteFill>
		);
	}
	if (f < IMPACT) {
		const sw = Math.sin(f * 0.25);
		const appear = sm(f, [
			[104, 0],
			[114, 1],
		]);
		const push = sm(f, [
			[166, 0],
			[174, 1],
			[182, 1],
			[190, 0],
		]);
		const reach = sm(f, [
			[232, 0],
			[246, 1],
		]);
		const drop = (1 - appear) * 600;
		return (
			<AbsoluteFill>
				{place(250 + reach * 60, 1350 + sw * 90 + drop - reach * 120, 16 - sw * 6, 1, <HandFist />, 'l')}
				{place(
					830 - push * 230 - reach * 160,
					1350 - sw * 90 * (1 - push) + drop - push * 330 - reach * 280,
					-16 + sw * 6 + push * 10,
					1 - push * 0.2 - reach * 0.15,
					push > 0.4 || reach > 0.4 ? <HandOpen mirror /> : <HandFist mirror />,
					'r',
				)}
			</AbsoluteFill>
		);
	}
	const a = f - IMPACT;
	if (a < 8) {
		return (
			<AbsoluteFill>
				{place(200 - a * 40, 1200 - a * 140, 30 - a * 8, 1, <HandOpen />, 'l')}
				{place(880 + a * 40, 1200 - a * 120, -30 + a * 8, 1, <HandOpen mirror />, 'r')}
			</AbsoluteFill>
		);
	}
	// lying on the ground, one hand reaching
	const reach = sm(a, [
		[18, 0],
		[36, 1],
	]);
	return (
		<AbsoluteFill>
			{place(330 + reach * 40, 1150 - reach * 70, roll + 115, 0.85, <HandOpen />, 'g')}
		</AbsoluteFill>
	);
};

const Ash: React.FC<{f: number; amount: number}> = ({f, amount}) => {
	if (amount <= 0) return null;
	const n = Math.round(70 * amount);
	return (
		<AbsoluteFill>
			{Array.from({length: n}).map((_, i) => {
				const x = (random(`ax${i}`) * 1200 + Math.sin(f * 0.04 + i) * 40 + f * (random(`av${i}`) - 0.5) * 3) % 1200;
				const y = (random(`ay${i}`) * 2100 + f * (2 + random(`af${i}`) * 5)) % 2100;
				const ember = i % 6 === 0;
				const s = 6 + random(`as${i}`) * 12;
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: x - 60,
							top: y - 100,
							width: s,
							height: s * 0.7,
							background: ember ? '#ffb060' : '#ebe4da',
							opacity: 0.8,
							transform: `rotate(${f * 6 + i * 40}deg)`,
						}}
					/>
				);
			})}
		</AbsoluteFill>
	);
};

