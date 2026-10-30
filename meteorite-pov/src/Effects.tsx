import React from 'react';
import * as THREE from 'three';
import {random} from 'remotion';
import {IMPACT, IMPACT_POS, METEOR_START, clamp01, meteorPos, meteorProgress} from './timeline';

const additive = {transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false} as const;

const DIR_BACK = METEOR_START.clone().sub(IMPACT_POS).normalize();

export const Meteor: React.FC<{f: number; camPos: THREE.Vector3}> = ({f, camPos}) => {
	if (f < 12 || f >= IMPACT) return null;
	const pos = meteorPos(f);
	const dist = pos.distanceTo(camPos);
	// keep it readable from far away
	const g = Math.max(1, dist * 0.025);
	const spin = f * 0.15;
	const trail = Array.from({length: 34});
	// smoke contrail left along the path
	const smokeCount = 46;
	const pNow = meteorProgress(f);
	return (
		<group>
			<group position={pos.toArray()}>
				<mesh rotation={[spin, spin * 0.7, 0]}>
					<dodecahedronGeometry args={[1.3, 0]} />
					<meshStandardMaterial color="#2a1a14" emissive="#ff5418" emissiveIntensity={1.4} flatShading fog={false} />
				</mesh>
				<mesh>
					<sphereGeometry args={[1.9 * g, 12, 10]} />
					<meshBasicMaterial color="#ffd27a" opacity={0.75} {...additive} />
				</mesh>
				<mesh>
					<sphereGeometry args={[3.6 * g, 12, 10]} />
					<meshBasicMaterial color="#ff7a2a" opacity={0.35} {...additive} />
				</mesh>
				<mesh>
					<sphereGeometry args={[7 * g, 12, 10]} />
					<meshBasicMaterial color="#ff5a1a" opacity={0.12} {...additive} />
				</mesh>
			</group>
			{/* fire tail */}
			{trail.map((_, i) => {
				const t = i / trail.length;
				const off = DIR_BACK.clone().multiplyScalar(i * 0.9 * g + 1);
				const wob = Math.sin(f * 0.9 + i) * 0.15 * g;
				const p = pos.clone().add(off).add(new THREE.Vector3(wob, wob * 0.5, 0));
				const col = new THREE.Color('#ffe08a').lerp(new THREE.Color('#ff4a12'), Math.min(1, t * 1.6));
				return (
					<mesh key={i} position={p.toArray()}>
						<sphereGeometry args={[(1.6 - t * 1.2) * g, 8, 6]} />
						<meshBasicMaterial color={col} opacity={0.55 * (1 - t)} {...additive} />
					</mesh>
				);
			})}
			{/* lingering smoke contrail */}
			{Array.from({length: smokeCount}).map((_, i) => {
				const t = (i / smokeCount) * pNow;
				const age = pNow - t;
				const p = new THREE.Vector3().lerpVectors(METEOR_START, IMPACT_POS, t);
				p.y += age * 6;
				p.x += Math.sin(i * 1.3) * age * 4;
				const d = p.distanceTo(camPos);
				const r = (1.5 + age * 9) * Math.max(1, d * 0.012);
				return (
					<mesh key={`s${i}`} position={p.toArray()}>
						<icosahedronGeometry args={[r, 1]} />
						<meshBasicMaterial color="#d8d0c6" transparent opacity={0.28 * (1 - age * 0.8)} depthWrite={false} fog={false} />
					</mesh>
				);
			})}
		</group>
	);
};

type Particle = {
	dir: THREE.Vector3;
	speed: number;
	size: number;
	rot: THREE.Vector3;
	color: string;
};

const DEBRIS: Particle[] = Array.from({length: 70}).map((_, i) => {
	const ang = random(`da${i}`) * Math.PI * 2;
	const up = 0.35 + random(`du${i}`) * 0.9;
	return {
		dir: new THREE.Vector3(Math.cos(ang), up, Math.sin(ang)).normalize(),
		speed: 8 + random(`ds${i}`) * 18,
		size: 0.12 + random(`dz${i}`) * 0.45,
		rot: new THREE.Vector3(random(`r1${i}`), random(`r2${i}`), random(`r3${i}`)).multiplyScalar(0.5),
		color: ['#5b4d42', '#7a6b5c', '#3a302a', '#8d8174'][i % 4],
	};
});

const DUST: Particle[] = Array.from({length: 90}).map((_, i) => {
	const ang = random(`ta${i}`) * Math.PI * 2;
	return {
		dir: new THREE.Vector3(Math.cos(ang), 0.05 + random(`tu${i}`) * 0.25, Math.sin(ang)).normalize(),
		speed: 6 + random(`ts${i}`) * 12,
		size: 0.6 + random(`tz${i}`) * 1.1,
		rot: new THREE.Vector3(random(`q1${i}`), random(`q2${i}`), 0),
		color: ['#8a7a68', '#9c8d7c', '#6f6256', '#b0a290'][i % 4],
	};
});

const FIRES = Array.from({length: 9}).map((_, i) => {
	const ang = random(`fa${i}`) * Math.PI * 2;
	const r = 1.5 + random(`fr${i}`) * 5;
	return new THREE.Vector3(IMPACT_POS.x + Math.cos(ang) * r, 0, IMPACT_POS.z + Math.sin(ang) * r);
});

export const Impact: React.FC<{f: number}> = ({f}) => {
	if (f < IMPACT) return null;
	const a = f - IMPACT;
	const fireR = 1 + 13 * (1 - Math.exp(-a / 5));
	const fireFade = clamp01(1 - a / 28);
	const ring = a * 3.2;
	return (
		<group>
			{/* crater */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[IMPACT_POS.x, 0.03, IMPACT_POS.z]}>
				<circleGeometry args={[4.5, 14]} />
				<meshStandardMaterial color="#241c17" flatShading />
			</mesh>
			{/* fireball */}
			<mesh position={[IMPACT_POS.x, fireR * 0.4, IMPACT_POS.z]}>
				<icosahedronGeometry args={[fireR, 1]} />
				<meshBasicMaterial
					color={new THREE.Color('#fff2c4').lerp(new THREE.Color('#ff5a14'), clamp01(a / 10))}
					opacity={0.9 * fireFade}
					{...additive}
				/>
			</mesh>
			<mesh position={[IMPACT_POS.x, fireR * 0.5, IMPACT_POS.z]}>
				<icosahedronGeometry args={[fireR * 1.5, 1]} />
				<meshBasicMaterial color="#ff8a3a" opacity={0.35 * fireFade} {...additive} />
			</mesh>
			{/* shockwave ring */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[IMPACT_POS.x, 0.4, IMPACT_POS.z]}>
				<ringGeometry args={[ring, ring + 1.5 + a * 0.2, 40]} />
				<meshBasicMaterial color="#fff0d0" opacity={clamp01(0.8 - a / 20)} side={THREE.DoubleSide} {...additive} />
			</mesh>
			{/* rising smoke column */}
			{Array.from({length: 22}).map((_, i) => {
				const born = i * 1.2;
				if (a < born) return null;
				const age = a - born;
				const y = 3.5 + age * 0.9 + i * 0.8;
				const r = Math.min(3, 1.2 + age * 0.1 + i * 0.07);
				return (
					<mesh
						key={i}
						position={[IMPACT_POS.x + Math.sin(i * 2.1) * 1.5, y, IMPACT_POS.z + Math.cos(i * 1.7) * 1.5]}
					>
						<icosahedronGeometry args={[r, 1]} />
						<meshStandardMaterial
							color="#3b332d"
							emissive="#ff5a14"
							emissiveIntensity={clamp01(1 - age / 14) * 0.9}
							flatShading
							transparent
							opacity={0.85}
						/>
					</mesh>
				);
			})}
			{/* dust wall rushing outwards */}
			{DUST.map((d, i) => {
				const dist = Math.min(5.5, d.speed * (1 - Math.exp(-a / 9)) * 0.8);
				const p = IMPACT_POS.clone().add(d.dir.clone().multiplyScalar(dist));
				p.y = Math.max(d.size * 0.5, p.y + a * 0.03);
				const s = d.size * (0.5 + Math.min(0.7, a * 0.03));
				return (
					<mesh key={`d${i}`} position={p.toArray()} rotation={[d.rot.x * a * 0.05, d.rot.y * a * 0.05, 0]}>
						<icosahedronGeometry args={[s, 0]} />
						<meshStandardMaterial color={d.color} flatShading transparent opacity={clamp01(0.6 - a / 150)} />
					</mesh>
				);
			})}
			{/* debris chunks */}
			{DEBRIS.map((d, i) => {
				const tt = a / 30;
				const v = d.dir.clone().multiplyScalar(d.speed);
				const p = IMPACT_POS.clone().add(v.clone().multiplyScalar(tt));
				p.y = 0.3 + v.y * tt - 4.9 * tt * tt * 3;
				const landed = p.y <= d.size * 0.5;
				if (landed) p.y = d.size * 0.5;
				const spin = landed ? 0 : a;
				return (
					<mesh
						key={`b${i}`}
						position={p.toArray()}
						rotation={[d.rot.x * spin, d.rot.y * spin, d.rot.z * spin]}
						castShadow
					>
						<boxGeometry args={[d.size, d.size * 0.7, d.size * 0.9]} />
						<meshStandardMaterial color={d.color} flatShading />
					</mesh>
				);
			})}
			{/* fires in the rubble */}
			{FIRES.map((p, i) => {
				const flick = 0.75 + Math.sin(a * 1.3 + i * 2) * 0.15 + Math.sin(a * 2.7 + i) * 0.1;
				const grow = clamp01((a - 4 - i) / 10);
				if (grow <= 0) return null;
				return (
					<group key={`f${i}`} position={p.toArray()}>
						<mesh position={[0, 0.6 * flick * grow, 0]}>
							<coneGeometry args={[0.45 * grow, 1.4 * flick * grow, 5]} />
							<meshBasicMaterial color="#ff7a1a" opacity={0.9} {...additive} />
						</mesh>
						<mesh position={[0, 0.4 * flick * grow, 0]}>
							<coneGeometry args={[0.25 * grow, 0.8 * flick * grow, 5]} />
							<meshBasicMaterial color="#ffe08a" opacity={0.9} {...additive} />
						</mesh>
					</group>
				);
			})}
		</group>
	);
};

// Ash / embers floating around the camera
export const Ash: React.FC<{f: number; camPos: THREE.Vector3; amount: number}> = ({f, camPos, amount}) => {
	if (amount <= 0) return null;
	const n = Math.round(80 * amount);
	return (
		<group>
			{Array.from({length: n}).map((_, i) => {
				const sx = random(`ax${i}`) * 8 - 4;
				const sy = random(`ay${i}`) * 5;
				const sz = random(`az${i}`) * 8 - 4;
				const fall = (sy - f * (0.01 + random(`af${i}`) * 0.02)) % 5;
				const p = new THREE.Vector3(
					camPos.x + sx + Math.sin(f * 0.05 + i) * 0.3,
					camPos.y - 2 + ((fall + 5) % 5),
					camPos.z + sz,
				);
				const ember = i % 7 === 0;
				return (
					<mesh key={i} position={p.toArray()} rotation={[f * 0.1 + i, f * 0.07, 0]}>
						<planeGeometry args={[ember ? 0.03 : 0.05, ember ? 0.03 : 0.035]} />
						<meshBasicMaterial
							color={ember ? '#ffb060' : '#e9e2d8'}
							side={THREE.DoubleSide}
							transparent
							opacity={0.85}
							fog={false}
						/>
					</mesh>
				);
			})}
		</group>
	);
};
