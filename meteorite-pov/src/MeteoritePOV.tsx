import React from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {House, Neighbourhood, Sky} from './World';
import {Mom, PlayerHands} from './Characters';
import {Ash, Impact, Meteor} from './Effects';
import {DOOR_OPEN_START, IMPACT, IMPACT_POS, Pose, cameraPose, clamp01, heat, meteorPos, sm} from './timeline';

const CameraRig: React.FC<{pose: Pose}> = ({pose}) => {
	const {camera} = useThree();
	camera.position.copy(pose.pos);
	camera.quaternion.copy(pose.quat);
	camera.updateMatrixWorld();
	return null;
};

const Scene: React.FC<{f: number; pose: Pose}> = ({f, pose}) => {
	const h = heat(f);
	const a = f - IMPACT;
	const dust = f >= IMPACT ? clamp01(a / 25) : 0;
	const fogColor = new THREE.Color('#d9cbb6').lerp(new THREE.Color('#d98a55'), h * 0.45).lerp(new THREE.Color('#7d6a58'), dust);
	const fogDensity = 0.012 + h * 0.004 + dust * 0.03;
	const mPos = meteorPos(Math.min(f, IMPACT - 1));
	const doorAngle = sm(f, [
		[DOOR_OPEN_START, 0],
		[DOOR_OPEN_START + 10, 1.75],
	]);
	const fireLight = f >= IMPACT ? (a < 4 ? 400 : 120 * Math.exp(-(a - 4) / 20) + 25 + Math.sin(a * 1.4) * 6) : 0;
	return (
		<>
			<CameraRig pose={pose} />
			<fogExp2 attach="fog" args={[fogColor, fogDensity]} />
			<Sky heat={h} dust={dust} />
			<hemisphereLight args={['#f1e4cf', '#6b5a48', 1.1 - dust * 0.4]} />
			<ambientLight intensity={0.25} />
			<directionalLight
				position={[-25, 35, -12]}
				intensity={1.6 - dust * 0.9}
				color="#fff1da"
				castShadow
				shadow-mapSize={[1024, 1024]}
				shadow-camera-left={-25}
				shadow-camera-right={25}
				shadow-camera-top={25}
				shadow-camera-bottom={-25}
				shadow-camera-far={120}
				shadow-bias={-0.0005}
			/>
			{/* living room lamp */}
			<pointLight position={[0, 2.5, -3]} intensity={6} distance={10} decay={1.5} color="#ffd9a0" />
			{/* the meteor lights everything up as it gets closer */}
			{f < IMPACT && (
				<pointLight position={mPos.toArray()} intensity={h * 900} distance={200} decay={1.6} color="#ff8a3a" />
			)}
			{f >= IMPACT && (
				<pointLight
					position={[IMPACT_POS.x, 3, IMPACT_POS.z]}
					intensity={fireLight}
					distance={60}
					decay={1.4}
					color="#ff7a2a"
				/>
			)}
			<House doorAngle={doorAngle} />
			<Neighbourhood />
			<Mom f={f} />
			<Meteor f={f} camPos={pose.pos} />
			<Impact f={f} />
			<Ash f={f} camPos={pose.pos} amount={f >= IMPACT ? 1 : h > 0.5 ? (h - 0.5) * 0.6 : 0} />
			<PlayerHands f={f} pose={pose} />
		</>
	);
};

export const MeteoritePOV: React.FC = () => {
	const f = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const pose = cameraPose(f);
	const h = heat(f);
	const a = f - IMPACT;

	const whipBlur = sm(f, [
		[96, 0],
		[104, 5],
		[114, 0],
	]);
	const impactBlur = f >= IMPACT ? 9 * Math.exp(-a / 6) + 1.6 + Math.max(0, Math.sin(a * 0.25)) * 1.5 : 0;
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
	const desat = f >= IMPACT ? 0.35 : 0;

	return (
		<AbsoluteFill style={{backgroundColor: '#000'}}>
			<AbsoluteFill
				style={{
					filter: `blur(${(whipBlur + impactBlur).toFixed(2)}px) sepia(${0.12 + h * 0.15}) saturate(${0.95 - desat}) contrast(1.06)`,
					transform: `scale(${1.03 + (f >= IMPACT ? 0.04 * Math.exp(-a / 8) : 0)})`,
				}}
			>
				<ThreeCanvas
					width={width}
					height={height}
					shadows
					camera={{fov: 72, near: 0.03, far: 1200}}
					gl={{antialias: true}}
				>
					<Scene f={f} pose={pose} />
				</ThreeCanvas>
			</AbsoluteFill>
			{/* orange heat as the meteor comes in */}
			<AbsoluteFill
				style={{
					background: 'radial-gradient(circle at 45% 25%, rgba(255,140,60,0.55), rgba(255,90,30,0) 65%)',
					opacity: f < IMPACT ? h * 0.8 : 0,
					mixBlendMode: 'screen',
				}}
			/>
			{/* vignette */}
			<AbsoluteFill
				style={{
					background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(20,10,5,0.55) 100%)',
				}}
			/>
			{/* concussion tunnel vision */}
			<AbsoluteFill
				style={{
					background: 'radial-gradient(ellipse 60% 48% at 50% 48%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.96) 100%)',
					opacity: tunnel,
				}}
			/>
			<AbsoluteFill style={{backgroundColor: '#fff6e6', opacity: flash}} />
			{/* eyelids */}
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: 0,
					height: `${lids * 51}%`,
					background: '#000',
					borderBottomLeftRadius: '50% 30%',
					borderBottomRightRadius: '50% 30%',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					bottom: 0,
					height: `${lids * 51}%`,
					background: '#000',
					borderTopLeftRadius: '50% 30%',
					borderTopRightRadius: '50% 30%',
				}}
			/>
			<AbsoluteFill style={{backgroundColor: '#000', opacity: black}} />
		</AbsoluteFill>
	);
};
