import * as THREE from 'three';

export const FPS = 30;
export const DURATION = 300;
export const IMPACT = 250;

export const IMPACT_POS = new THREE.Vector3(0.5, 0, 12.5);
export const METEOR_START = new THREE.Vector3(-45, 95, 150);
export const MOM_POS = new THREE.Vector3(-0.4, 0, 6.8);
const WINDOW_EYE = new THREE.Vector3(-1.45, 1.55, -0.6);

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const smooth = (t: number) => {
	const c = clamp01(t);
	return c * c * (3 - 2 * c);
};

type Keys = [number, number][];

// Smoothstep between keys (eases in/out at every key)
export const sm = (f: number, keys: Keys) => {
	if (f <= keys[0][0]) return keys[0][1];
	for (let i = 0; i < keys.length - 1; i++) {
		const [f0, v0] = keys[i];
		const [f1, v1] = keys[i + 1];
		if (f <= f1) return v0 + (v1 - v0) * smooth((f - f0) / (f1 - f0));
	}
	return keys[keys.length - 1][1];
};

// Linear between keys (constant speed, used for the run)
export const lin = (f: number, keys: Keys) => {
	if (f <= keys[0][0]) return keys[0][1];
	for (let i = 0; i < keys.length - 1; i++) {
		const [f0, v0] = keys[i];
		const [f1, v1] = keys[i + 1];
		if (f <= f1) return v0 + (v1 - v0) * ((f - f0) / (f1 - f0));
	}
	return keys[keys.length - 1][1];
};

export const meteorProgress = (f: number) =>
	Math.pow(clamp01((f - 12) / (IMPACT - 12)), 1.7);

export const meteorPos = (f: number) =>
	new THREE.Vector3().lerpVectors(METEOR_START, IMPACT_POS, meteorProgress(f));

// 0 = calm, 1 = meteor about to hit
export const heat = (f: number) =>
	f >= IMPACT ? 1 : Math.pow(meteorProgress(f), 2.2);

// Deterministic pseudo noise for camera shake
const noise = (f: number, seed: number) =>
	Math.sin(f * 1.7 + seed) * 0.5 +
	Math.sin(f * 3.1 + seed * 2.3) * 0.3 +
	Math.sin(f * 5.9 + seed * 4.1) * 0.2;

export const shakeAmount = (f: number) => {
	if (f >= IMPACT) return 0.45 * Math.exp(-(f - IMPACT) / 5) + 0.012;
	return 0.004 + 0.05 * Math.pow(heat(f), 1.5);
};

const yawDir = (deg: number) => {
	const r = (deg * Math.PI) / 180;
	return new THREE.Vector3(Math.sin(r), 0, Math.cos(r));
};

const lookTowardMeteor = (eye: THREE.Vector3, f: number, dist = 8) =>
	meteorPos(f).sub(eye).normalize().multiplyScalar(dist).add(eye);

export const RUN_START = 98;
export const DOOR_OPEN_START = 186;

const runPos = (f: number) =>
	new THREE.Vector3(
		lin(f, [
			[RUN_START, -1.45],
			[114, -1.7],
			[160, 1.5],
			[182, 2.75],
			[198, 2.8],
			[212, 2.7],
			[247, 2.0],
		]),
		1.6,
		lin(f, [
			[RUN_START, -0.6],
			[114, -1.15],
			[160, -1.75],
			[182, -1.45],
			[198, -0.55],
			[212, 0.9],
			[247, 3.7],
		]),
	);

const runYaw = (f: number) =>
	sm(f, [
		[114, 95],
		[158, 95],
		[180, 8],
		[198, 0],
		[212, -10],
		[247, -16],
	]);

const isRunning = (f: number) => f >= 114 && f < 247 && !(f > 182 && f < 196);

export type Pose = {
	pos: THREE.Vector3;
	quat: THREE.Quaternion;
};

export const cameraPose = (f: number): Pose => {
	const momChest = MOM_POS.clone().add(new THREE.Vector3(0, 1.1, 0));
	let pos: THREE.Vector3;
	let target: THREE.Vector3;
	let roll = 0;

	if (f < RUN_START) {
		// At the window: look at mom, up at the sky, back to mom, bang on the glass
		pos = WINDOW_EYE.clone();
		const bang = f > 82 ? Math.max(0, Math.sin((f - 82) * 0.9)) * 0.06 : 0;
		pos.z += bang;
		pos.x += Math.sin(f * 0.05) * 0.02;
		const w = sm(f, [
			[0, 0],
			[28, 0],
			[48, 0.92],
			[66, 0.92],
			[84, 0.1],
		]);
		target = new THREE.Vector3().lerpVectors(
			momChest,
			lookTowardMeteor(pos, f, momChest.distanceTo(pos)),
			w,
		);
	} else {
		pos = runPos(f);
		// Whip pan from the window to the room
		const whip = smooth((f - RUN_START) / 14);
		const fromWin = new THREE.Vector3().lerpVectors(
			momChest,
			lookTowardMeteor(pos, f, momChest.distanceTo(pos)),
			0.1,
		);
		const runTarget = pos.clone().add(yawDir(runYaw(Math.max(f, 114))).multiplyScalar(5));
		runTarget.y = 1.45;
		target = new THREE.Vector3().lerpVectors(
			fromWin.sub(pos).normalize().multiplyScalar(5).add(pos),
			runTarget,
			whip,
		);

		// Outside: look at mom, then up at the meteor
		const outside = smooth((f - 210) / 18);
		if (outside > 0) {
			const wm = sm(f, [
				[210, 0.15],
				[230, 0.3],
				[247, 0.55],
			]);
			const outTarget = new THREE.Vector3().lerpVectors(
				momChest.clone().sub(pos).normalize().multiplyScalar(6).add(pos),
				lookTowardMeteor(pos, Math.min(f, IMPACT - 1), 6),
				wm,
			);
			target.lerp(outTarget, outside);
		}

		if (isRunning(f)) {
			const p = f * 0.5;
			pos.y += Math.abs(Math.sin(p)) * 0.07 - 0.03;
			pos.x += Math.sin(p * 0.5) * 0.035;
			roll += Math.sin(p * 0.5) * 0.02;
		}

		if (f >= IMPACT) {
			// Thrown back and down to the ground
			const a = f - IMPACT;
			const s = clamp01(a / 13);
			const k = 1 - Math.pow(1 - s, 3);
			const p250 = runPos(IMPACT);
			const landed = new THREE.Vector3(2.1, 0.25, 3.2);
			pos = new THREE.Vector3().lerpVectors(p250, landed, k);
			pos.y += Math.sin(s * Math.PI) * 0.45;
			const t250 = lookTowardMeteor(p250, IMPACT - 1, 6);
			const groundLook = new THREE.Vector3(0.6, 0.55, 11);
			target = new THREE.Vector3().lerpVectors(t250, groundLook, k);
			// tumble then settle on the side
			roll = 0.95 * k + Math.sin(s * Math.PI) * 0.6;
			// dazed breathing
			const b = clamp01((a - 14) / 10);
			target.y += Math.sin(a * 0.12) * 0.12 * b;
			pos.y += Math.sin(a * 0.12) * 0.01 * b;
		}
	}

	const amt = shakeAmount(f);
	target.x += noise(f, 1) * amt * 2;
	target.y += noise(f, 7) * amt * 2;
	pos.x += noise(f, 13) * amt * 0.15;
	pos.y += noise(f, 21) * amt * 0.15;
	roll += noise(f, 3) * amt * 0.4;

	const m = new THREE.Matrix4().lookAt(pos, target, new THREE.Vector3(0, 1, 0));
	const quat = new THREE.Quaternion().setFromRotationMatrix(m);
	quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll));
	return {pos, quat};
};
