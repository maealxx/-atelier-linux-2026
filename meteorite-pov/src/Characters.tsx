import React from 'react';

import {Box} from './World';
import {DOOR_OPEN_START, IMPACT, MOM_POS, Pose, RUN_START, sm} from './timeline';

const SKIN = '#e0a982';
const SKIN_MOM = '#d9a07a';

export const Mom: React.FC<{f: number}> = ({f}) => {
	if (f > IMPACT + 1) return null;
	// watering the flowers, looks up at the sky, then turns to us
	const yaw = sm(f, [
		[0, -2.0],
		[214, -2.0],
		[234, -3.75],
	]);
	const headPitch = sm(f, [
		[0, 0.25],
		[130, 0.25],
		[150, -0.55],
		[214, -0.55],
		[232, -0.1],
	]);
	const rightArm = sm(f, [
		[0, -0.7],
		[150, -0.7],
		[165, -0.2],
		[220, -0.2],
		[236, -1.5],
	]);
	const leftArm = sm(f, [
		[0, -0.15],
		[222, -0.15],
		[238, -1.9],
	]);
	const canDrop = f > 158 ? Math.min(1, (f - 158) / 8) : 0;
	const breathe = Math.sin(f * 0.15) * 0.01;
	return (
		<group position={MOM_POS.toArray()} rotation={[0, yaw, 0]}>
			{/* shadow blob */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
				<circleGeometry args={[0.38, 12]} />
				<meshBasicMaterial color="#000" transparent opacity={0.22} />
			</mesh>
			{/* legs + shoes */}
			<Box p={[-0.09, 0.25, 0]} s={[0.11, 0.5, 0.11]} c={SKIN_MOM} />
			<Box p={[0.09, 0.25, 0]} s={[0.11, 0.5, 0.11]} c={SKIN_MOM} />
			<Box p={[-0.09, 0.04, 0.04]} s={[0.12, 0.08, 0.22]} c="#eeeeee" />
			<Box p={[0.09, 0.04, 0.04]} s={[0.12, 0.08, 0.22]} c="#eeeeee" />
			{/* dress */}
			<mesh position={[0, 0.82, 0]} castShadow>
				<cylinderGeometry args={[0.19, 0.32, 0.7, 7]} />
				<meshStandardMaterial color="#7fa6cf" flatShading />
			</mesh>
			<group position={[0, breathe, 0]}>
				<Box p={[0, 1.3, 0]} s={[0.38, 0.44, 0.22]} c="#7fa6cf" />
				{/* arms (pivot at the shoulders) */}
				<group position={[-0.24, 1.48, 0]} rotation={[leftArm, 0, 0.12]}>
					<Box p={[0, -0.26, 0]} s={[0.09, 0.52, 0.09]} c={SKIN_MOM} />
				</group>
				<group position={[0.24, 1.48, 0]} rotation={[rightArm, 0, -0.12]}>
					<Box p={[0, -0.26, 0]} s={[0.09, 0.52, 0.09]} c={SKIN_MOM} />
				</group>
				{/* head */}
				<Box p={[0, 1.57, 0]} s={[0.09, 0.08, 0.09]} c={SKIN_MOM} />
				<group position={[0, 1.7, 0]} rotation={[headPitch, 0, 0]}>
					<mesh castShadow>
						<icosahedronGeometry args={[0.14, 1]} />
						<meshStandardMaterial color={SKIN_MOM} flatShading />
					</mesh>
					<mesh position={[0, 0.03, -0.03]}>
						<icosahedronGeometry args={[0.15, 1]} />
						<meshStandardMaterial color="#3a2a22" flatShading />
					</mesh>
					<mesh position={[0, 0.02, -0.17]}>
						<icosahedronGeometry args={[0.07, 0]} />
						<meshStandardMaterial color="#3a2a22" flatShading />
					</mesh>
					<Box p={[-0.05, 0.0, 0.13]} s={[0.025, 0.035, 0.01]} c="#1b1411" shadow={false} />
					<Box p={[0.05, 0.0, 0.13]} s={[0.025, 0.035, 0.01]} c="#1b1411" shadow={false} />
				</group>
			</group>
			{/* watering can: in her hand, then dropped */}
			<group
				position={[0.3, 1.0 - canDrop * 0.85, 0.35 + canDrop * 0.15]}
				rotation={[0, 0, canDrop * 1.4]}
			>
				<mesh castShadow>
					<cylinderGeometry args={[0.1, 0.12, 0.2, 8]} />
					<meshStandardMaterial color="#4f8a6a" flatShading />
				</mesh>
				<Box p={[0, 0, 0.17]} s={[0.03, 0.03, 0.22]} c="#4f8a6a" r={[-0.6, 0, 0]} />
			</group>
		</group>
	);
};

// One forearm + fist pointing along local -Z
const Arm: React.FC<{mirror?: boolean; open?: boolean}> = ({mirror, open}) => (
	<group scale={[mirror ? -1 : 1, 1, 1]}>
		<Box p={[0, 0, 0.3]} s={[0.12, 0.12, 0.6]} c="#2c3e5a" shadow={false} />
		<Box p={[0, 0, 0.02]} s={[0.135, 0.135, 0.06]} c="#24344c" shadow={false} />
		{open ? (
			<>
				<Box p={[0, -0.01, -0.07]} s={[0.11, 0.035, 0.12]} c={SKIN} shadow={false} />
				{[-0.04, -0.013, 0.013, 0.04].map((x) => (
					<Box key={x} p={[x, -0.01, -0.17]} s={[0.022, 0.025, 0.09]} c={SKIN} shadow={false} />
				))}
				<Box p={[0.07, -0.01, -0.07]} s={[0.025, 0.025, 0.07]} c={SKIN} r={[0, 0.6, 0]} shadow={false} />
			</>
		) : (
			<>
				<Box p={[0, 0, -0.08]} s={[0.11, 0.09, 0.12]} c={SKIN} shadow={false} />
				<Box p={[0, 0.015, -0.145]} s={[0.1, 0.05, 0.03]} c="#cf9672" shadow={false} />
				<Box p={[0.06, 0.02, -0.06]} s={[0.025, 0.04, 0.07]} c={SKIN} shadow={false} />
			</>
		)}
	</group>
);

export const PlayerHands: React.FC<{f: number; pose: Pose}> = ({f, pose}) => {
	// 1) Hands on the window sill, banging on the glass
	if (f < RUN_START + 2) {
		const bang = f > 82 ? Math.max(0, Math.sin((f - 82) * 0.9)) : 0;
		const lift = sm(f, [
			[74, 0],
			[84, 1],
		]);
		const y = -0.36 + lift * 0.14;
		const z = -0.5 - bang * 0.12 * lift;
		return (
			<group position={pose.pos.toArray()} quaternion={pose.quat}>
				<group position={[-0.13, y, z]} rotation={[0.35 - lift * 0.25, 0.15, 0]}>
					<Arm open={lift < 0.5} />
				</group>
				<group position={[0.13, y + 0.02, z]} rotation={[0.35 - lift * 0.25, -0.15, 0]}>
					<Arm mirror open={lift < 0.5} />
				</group>
			</group>
		);
	}

	// 3) Knocked down: one hand lying on the ground, reaching
	if (f >= IMPACT) {
		const a = f - IMPACT;
		if (a < 9) {
			// arms fly up with the blast
			return (
				<group position={pose.pos.toArray()} quaternion={pose.quat}>
					<group position={[-0.16 - a * 0.03, -0.25 + a * 0.06, -0.5]} rotation={[0.6 + a * 0.1, 0.3, 0]}>
						<Arm open />
					</group>
					<group position={[0.16 + a * 0.03, -0.25 + a * 0.05, -0.5]} rotation={[0.6 + a * 0.12, -0.3, 0]}>
						<Arm mirror open />
					</group>
				</group>
			);
		}
		const reach = sm(a, [
			[16, 0],
			[34, 1],
		]);
		return (
			<group position={[1.9, 0.06, 4.25 + reach * 0.15]} rotation={[-Math.PI / 2 + 0.05, 0, 0.35]}>
				<group rotation={[Math.PI / 2, 0, 0]}>
					<Arm open />
				</group>
			</group>
		);
	}

	// 2) Running: fists pumping at the bottom of the frame
	const p = f * 0.5;
	const swing = Math.sin(p * 0.5);
	const push = sm(f, [
		[DOOR_OPEN_START - 6, 0],
		[DOOR_OPEN_START + 2, 1],
		[DOOR_OPEN_START + 12, 1],
		[DOOR_OPEN_START + 20, 0],
	]);
	const appear = sm(f, [
		[RUN_START, 0],
		[RUN_START + 14, 1],
	]);
	const drop = (1 - appear) * 0.4;
	return (
		<group position={pose.pos.toArray()} quaternion={pose.quat}>
			<group position={[-0.15, -0.3 + swing * 0.08 - drop, -0.55 - swing * 0.08]} rotation={[0.5 + swing * 0.3, 0.25, 0]}>
				<Arm />
			</group>
			<group
				position={[
					0.15 - push * 0.08,
					-0.3 - swing * 0.08 * (1 - push) + push * 0.22 - drop,
					-0.55 + swing * 0.08 * (1 - push) - push * 0.2,
				]}
				rotation={[0.5 - swing * 0.3 * (1 - push) - push * 0.4, -0.25, 0]}
			>
				<Arm mirror open={push > 0.5} />
			</group>
		</group>
	);
};

