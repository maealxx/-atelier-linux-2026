import React from 'react';
import * as THREE from 'three';
import {random} from 'remotion';

type V3 = [number, number, number];

export const Box: React.FC<{
	p: V3;
	s: V3;
	c: string;
	r?: V3;
	shadow?: boolean;
	emissive?: string;
}> = ({p, s, c, r, shadow = true, emissive}) => (
	<mesh position={p} rotation={r} castShadow={shadow} receiveShadow>
		<boxGeometry args={s} />
		<meshStandardMaterial
			color={c}
			flatShading
			roughness={0.95}
			emissive={emissive ?? '#000000'}
			emissiveIntensity={emissive ? 0.6 : 0}
		/>
	</mesh>
);

const WALL = '#d8cbb3';
const WALL_OUT = '#c9bba2';
const TRIM = '#efe9dd';

// ---------- Our house: a living room with a front window and front door ----------
export const House: React.FC<{doorAngle: number}> = ({doorAngle}) => {
	const H = 2.8;
	const zW = -0.1;
	const T = 0.2;
	return (
		<group>
			{/* floor + rug */}
			<Box p={[0, -0.05, -3]} s={[12, 0.1, 6]} c="#7a5638" />
			{Array.from({length: 12}).map((_, i) => (
				<Box key={i} p={[-5.5 + i, 0.001, -3]} s={[0.02, 0.002, 6]} c="#5e412a" shadow={false} />
			))}
			<Box p={[-1, 0.01, -3.2]} s={[3.2, 0.02, 2.2]} c="#8c3b34" shadow={false} />
			{/* ceiling */}
			<Box p={[0, H + 0.05, -3]} s={[12, 0.1, 6.2]} c="#ece6da" />
			{/* back + side walls */}
			<Box p={[0, H / 2, -6]} s={[12, H, T]} c={WALL} />
			<Box p={[-6, H / 2, -3]} s={[T, H, 6]} c={WALL} />
			<Box p={[6, H / 2, -3]} s={[T, H, 6]} c={WALL} />
			{/* front wall pieces around window (x -3.4..-0.6, y 0.9..2.3) and door (x 2.3..3.3) */}
			<Box p={[-4.7, H / 2, zW]} s={[2.6, H, T]} c={WALL} />
			<Box p={[0.85, H / 2, zW]} s={[2.9, H, T]} c={WALL} />
			<Box p={[4.65, H / 2, zW]} s={[2.7, H, T]} c={WALL} />
			<Box p={[-2, 0.45, zW]} s={[2.8, 0.9, T]} c={WALL} />
			<Box p={[-2, 2.55, zW]} s={[2.8, 0.5, T]} c={WALL} />
			<Box p={[2.8, 2.475, zW]} s={[1, 0.65, T]} c={WALL} />
			{/* outer skin of facade + roof edge */}
			<Box p={[0, H + 0.25, 0.1]} s={[12.4, 0.5, 0.3]} c="#5b4a42" />
			{/* window frame */}
			<Box p={[-2, 0.88, -0.05]} s={[3.0, 0.06, 0.45]} c={TRIM} />
			<Box p={[-2, 2.32, zW]} s={[2.9, 0.06, 0.26]} c={TRIM} />
			<Box p={[-3.42, 1.6, zW]} s={[0.06, 1.5, 0.26]} c={TRIM} />
			<Box p={[-0.58, 1.6, zW]} s={[0.06, 1.5, 0.26]} c={TRIM} />
			<Box p={[-2, 1.6, zW]} s={[0.05, 1.4, 0.08]} c={TRIM} />
			<Box p={[-2, 1.62, zW]} s={[2.8, 0.04, 0.08]} c={TRIM} />
			<mesh position={[-2, 1.6, zW + 0.02]}>
				<planeGeometry args={[2.8, 1.4]} />
				<meshStandardMaterial color="#cfe3ea" transparent opacity={0.1} roughness={0.1} />
			</mesh>
			{/* curtains */}
			<Box p={[-3.75, 1.45, -0.35]} s={[0.55, 2.7, 0.08]} c="#7d8f8a" />
			<Box p={[-0.25, 1.45, -0.35]} s={[0.55, 2.7, 0.08]} c="#7d8f8a" />
			<Box p={[-2, 2.7, -0.35]} s={[4.4, 0.04, 0.04]} c="#3b3029" />
			{/* door frame + door panel hinged at x = 3.3 */}
			<Box p={[2.27, 1.08, zW]} s={[0.06, 2.16, 0.26]} c={TRIM} />
			<Box p={[3.33, 1.08, zW]} s={[0.06, 2.16, 0.26]} c={TRIM} />
			<Box p={[2.8, 2.17, zW]} s={[1.1, 0.06, 0.26]} c={TRIM} />
			<group position={[3.28, 0, zW]} rotation={[0, doorAngle, 0]}>
				<Box p={[-0.49, 1.07, 0]} s={[0.96, 2.12, 0.07]} c="#6b3d2a" />
				<Box p={[-0.49, 1.5, 0.04]} s={[0.6, 0.6, 0.02]} c="#5a3222" />
				<Box p={[-0.49, 0.6, 0.04]} s={[0.6, 0.6, 0.02]} c="#5a3222" />
				<Box p={[-0.85, 1.05, -0.06]} s={[0.05, 0.05, 0.08]} c="#c9a650" />
			</group>
			{/* furniture */}
			<Sofa />
			<Box p={[-4.9, 0.9, -5.6]} s={[1.2, 1.8, 0.5]} c="#5f4532" />
			{[0.45, 0.95, 1.45].map((y) => (
				<Box key={y} p={[-4.9, y, -5.32]} s={[1.05, 0.05, 0.1]} c="#4b3627" />
			))}
			{[[-5.2, 0.62, '#a24b3d'], [-4.9, 1.12, '#3e6a7a'], [-4.6, 1.6, '#c8a24a']].map(([x, y, c], i) => (
				<Box key={i} p={[x as number, y as number, -5.35]} s={[0.3, 0.32, 0.18]} c={c as string} />
			))}
			{/* lamp */}
			<Box p={[4.8, 0.75, -5.3]} s={[0.05, 1.5, 0.05]} c="#2d2622" />
			<mesh position={[4.8, 1.6, -5.3]}>
				<cylinderGeometry args={[0.15, 0.3, 0.35, 8]} />
				<meshStandardMaterial color="#f3e2b8" emissive="#ffcf7a" emissiveIntensity={0.7} flatShading />
			</mesh>
			{/* frames on the walls */}
			{[[-2.5, 1.7, '#7a8f6b'], [-1, 1.85, '#b4766a'], [0.4, 1.6, '#6f7f9c']].map(([x, y, c], i) => (
				<group key={i} position={[x as number, y as number, -5.88]}>
					<Box p={[0, 0, 0]} s={[0.8, 0.6, 0.04]} c="#3a2d24" />
					<Box p={[0, 0, 0.025]} s={[0.66, 0.46, 0.01]} c={c as string} />
				</group>
			))}
			{/* side table + plant near the door */}
			<Box p={[4.9, 0.4, -1]} s={[0.7, 0.8, 0.7]} c="#6b4b33" />
			<mesh position={[4.9, 1.05, -1]} castShadow>
				<icosahedronGeometry args={[0.32, 0]} />
				<meshStandardMaterial color="#5c7a4a" flatShading />
			</mesh>
			{/* porch */}
			<Box p={[2.8, 0.06, 0.9]} s={[2.4, 0.12, 1.6]} c="#9a9188" />
		</group>
	);
};

const Sofa = () => (
	<group position={[-1, 0, -5.3]}>
		<Box p={[0, 0.25, 0]} s={[2.6, 0.5, 1]} c="#55657a" />
		<Box p={[0, 0.75, -0.38]} s={[2.6, 0.7, 0.25]} c="#4b5a6e" />
		<Box p={[-1.3, 0.55, 0]} s={[0.25, 0.4, 1]} c="#4b5a6e" />
		<Box p={[1.3, 0.55, 0]} s={[0.25, 0.4, 1]} c="#4b5a6e" />
		<Box p={[-0.6, 0.62, 0.05]} s={[0.5, 0.3, 0.15]} c="#d9b25f" r={[0.2, 0, 0.1]} />
	</group>
);

// ---------- Neighbourhood ----------
const Tree: React.FC<{p: V3; s?: number}> = ({p, s = 1}) => (
	<group position={p} scale={s}>
		<mesh position={[0, 1, 0]} castShadow>
			<cylinderGeometry args={[0.12, 0.18, 2, 6]} />
			<meshStandardMaterial color="#5a4433" flatShading />
		</mesh>
		{[
			[0, 2.6, 0, 1.1],
			[0.5, 2.2, 0.3, 0.8],
			[-0.45, 2.3, -0.2, 0.85],
			[0, 3.2, 0.1, 0.75],
		].map(([x, y, z, r], i) => (
			<mesh key={i} position={[x, y, z]} castShadow>
				<icosahedronGeometry args={[r, 0]} />
				<meshStandardMaterial color={i % 2 ? '#6f8a5a' : '#7f9a66'} flatShading />
			</mesh>
		))}
	</group>
);

const Car: React.FC<{p: V3; c: string; ry?: number}> = ({p, c, ry = 0}) => (
	<group position={p} rotation={[0, ry, 0]}>
		<Box p={[0, 0.55, 0]} s={[4.2, 0.6, 1.8]} c={c} />
		<Box p={[-0.2, 1.1, 0]} s={[2.2, 0.55, 1.6]} c={c} />
		<Box p={[-0.2, 1.1, 0]} s={[2.0, 0.45, 1.65]} c="#2e3a46" />
		<Box p={[2.11, 0.6, 0.55]} s={[0.02, 0.18, 0.35]} c="#f4f0d8" />
		<Box p={[2.11, 0.6, -0.55]} s={[0.02, 0.18, 0.35]} c="#f4f0d8" />
		{[
			[1.3, 0.9],
			[1.3, -0.9],
			[-1.3, 0.9],
			[-1.3, -0.9],
		].map(([x, z], i) => (
			<mesh key={i} position={[x, 0.35, z]} rotation={[Math.PI / 2, 0, 0]}>
				<cylinderGeometry args={[0.35, 0.35, 0.25, 10]} />
				<meshStandardMaterial color="#1d1d1f" flatShading />
			</mesh>
		))}
	</group>
);

const Building: React.FC<{p: V3; w: number; h: number; d: number; c: string; roof?: string}> = ({
	p,
	w,
	h,
	d,
	c,
	roof,
}) => {
	const floors = Math.max(1, Math.floor(h / 1.6));
	const cols = Math.max(1, Math.floor(w / 1.6));
	return (
		<group position={p}>
			<Box p={[0, h / 2, 0]} s={[w, h, d]} c={c} />
			{roof && (
				<mesh position={[0, h + 0.9, 0]} rotation={[0, Math.PI / 4, 0]} scale={[w * 0.72, 1, d * 0.72]} castShadow>
					<coneGeometry args={[1, 1.8, 4]} />
					<meshStandardMaterial color={roof} flatShading />
				</mesh>
			)}
			{Array.from({length: floors}).map((_, fy) =>
				Array.from({length: cols}).map((__, cx) => (
					<Box
						key={`${fy}-${cx}`}
						p={[-w / 2 + (cx + 0.5) * (w / cols), 0.9 + fy * 1.6, -d / 2 - 0.01]}
						s={[0.7, 0.9, 0.04]}
						c={random(`${p}-${fy}-${cx}`) > 0.8 ? '#e0a64a' : '#2d3138'}
						shadow={false}
					/>
				)),
			)}
		</group>
	);
};

export const Neighbourhood: React.FC = () => (
	<group>
		{/* lawn */}
		<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 7]} receiveShadow>
			<planeGeometry args={[60, 15]} />
			<meshStandardMaterial color="#8a9466" flatShading />
		</mesh>
		{/* ground beyond */}
		<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 40]} receiveShadow>
			<planeGeometry args={[400, 400]} />
			<meshStandardMaterial color="#a39886" />
		</mesh>
		{/* path to the street */}
		<Box p={[2.8, 0.01, 7.3]} s={[1.3, 0.02, 13]} c="#bdb3a5" shadow={false} />
		{/* flower bed in front of mom */}
		<Box p={[-1.6, 0.08, 6.3]} s={[1.6, 0.16, 0.8]} c="#5d4330" />
		{Array.from({length: 10}).map((_, i) => (
			<mesh key={i} position={[-2.3 + (i % 5) * 0.35, 0.28, 6.1 + Math.floor(i / 5) * 0.4]} castShadow>
				<icosahedronGeometry args={[0.12, 0]} />
				<meshStandardMaterial color={['#d9566b', '#f2c14e', '#e98a3f', '#c95fa8'][i % 4]} flatShading />
			</mesh>
		))}
		{/* picket fence */}
		{Array.from({length: 40}).map((_, i) => {
			const x = -14 + i * 0.7;
			if (x > 2 && x < 3.6) return null;
			return <Box key={i} p={[x, 0.45, 14.3]} s={[0.12, 0.9, 0.06]} c="#ece6dc" />;
		})}
		<Box p={[-5.6, 0.6, 14.3]} s={[16.8, 0.08, 0.05]} c="#ece6dc" />
		<Box p={[9.1, 0.6, 14.3]} s={[11, 0.08, 0.05]} c="#ece6dc" />
		{/* mailbox */}
		<Box p={[4, 0.55, 13.9]} s={[0.08, 1.1, 0.08]} c="#3d3430" />
		<Box p={[4, 1.15, 13.9]} s={[0.3, 0.3, 0.5]} c="#3e5f8a" />
		{/* sidewalks + street */}
		<Box p={[0, 0.04, 15.4]} s={[200, 0.08, 1.8]} c="#c4beb4" shadow={false} />
		<Box p={[0, 0.0, 19.2]} s={[200, 0.02, 5.8]} c="#5d5c5c" shadow={false} />
		{Array.from({length: 30}).map((_, i) => (
			<Box key={i} p={[-60 + i * 4, 0.02, 19.2]} s={[1.8, 0.01, 0.15]} c="#e9e4d6" shadow={false} />
		))}
		<Box p={[0, 0.04, 23]} s={[200, 0.08, 1.8]} c="#c4beb4" shadow={false} />
		{/* houses on our side */}
		<Building p={[-13, 0, -3]} w={7} h={4.2} d={7} c="#b9a58c" roof="#6d4c3d" />
		<Building p={[13, 0, -3]} w={7} h={4.2} d={7} c="#a7b0a8" roof="#5b4a42" />
		{/* across the street */}
		<Building p={[-22, 0, 28]} w={8} h={9.6} d={7} c="#b8735a" />
		<Building p={[-12, 0, 28]} w={8} h={6.4} d={7} c="#d8cbb3" roof="#6d4c3d" />
		<Building p={[-2, 0, 28.5]} w={9} h={11.2} d={7} c="#c9c3b8" />
		<Building p={[8.5, 0, 28]} w={8} h={6.4} d={7} c="#a9b6b9" roof="#53473f" />
		<Building p={[18.5, 0, 28]} w={9} h={9.6} d={7} c="#b4836b" />
		<Building p={[29, 0, 28]} w={8} h={8} d={7} c="#d3c6ad" />
		{/* distant skyline */}
		{Array.from({length: 14}).map((_, i) => {
			const h = 14 + random(`skh${i}`) * 30;
			return (
				<Box key={i} p={[-70 + i * 11, h / 2, 70 + random(`sk${i}`) * 25]} s={[8, h, 8]} c="#b9b0a4" shadow={false} />
			);
		})}
		{/* trees */}
		<Tree p={[-12, 0, 15.6]} s={1.1} />
		<Tree p={[-4.5, 0, 15.6]} />
		<Tree p={[8, 0, 15.6]} s={1.15} />
		<Tree p={[16, 0, 15.6]} />
		<Tree p={[-6, 0, 4]} s={0.9} />
		<Tree p={[7, 0, 9]} s={1.05} />
		{/* lamp posts */}
		{[-9, 5, 20].map((x) => (
			<group key={x} position={[x, 0, 16.1]}>
				<Box p={[0, 2.2, 0]} s={[0.12, 4.4, 0.12]} c="#3a3a3c" />
				<Box p={[0, 4.4, 0.5]} s={[0.12, 0.1, 1.1]} c="#3a3a3c" />
				<Box p={[0, 4.3, 1]} s={[0.35, 0.1, 0.25]} c="#e9e4cf" />
			</group>
		))}
		{/* parked cars */}
		<Car p={[-7, 0, 17.4]} c="#7b3f33" />
		<Car p={[11, 0, 21]} c="#5a6a78" ry={Math.PI} />
		<Car p={[-20, 0, 21]} c="#c9c2b0" ry={Math.PI} />
	</group>
);

// Shared low-poly sky dome with a heat-tinted gradient
export const Sky: React.FC<{heat: number; dust: number}> = ({heat, dust}) => {
	const top = new THREE.Color('#a59a8f').lerp(new THREE.Color('#8a4a33'), heat * 0.6).lerp(new THREE.Color('#5c5148'), dust);
	const horizon = new THREE.Color('#e3d3bc').lerp(new THREE.Color('#e88a4a'), heat * 0.55).lerp(new THREE.Color('#8f7a64'), dust);
	return (
		<mesh>
			<sphereGeometry args={[500, 24, 16]} />
			<shaderMaterial
				side={THREE.BackSide}
				depthWrite={false}
				uniforms={{uTop: {value: top}, uHorizon: {value: horizon}}}
				vertexShader={`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `}
				fragmentShader={`uniform vec3 uTop; uniform vec3 uHorizon; varying vec3 vP;
					void main(){ float h = clamp(normalize(vP).y*2.2, 0.0, 1.0); gl_FragColor = vec4(mix(uHorizon, uTop, h), 1.0);} `}
			/>
		</mesh>
	);
};
