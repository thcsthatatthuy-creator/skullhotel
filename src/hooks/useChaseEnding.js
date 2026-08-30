/**
 * useChaseEnding.js
 *
 * Hook điều phối toàn bộ kịch bản "Chase Ending":
 * 1. Đặt lại vị trí player + monster về đầu hành lang
 * 2. Hiển thị countdown 3-2-1-Sẵn sàng-CHẠY
 * 3. Mở khóa điều khiển, bắt đầu 30s timer
 * 4. Monster đuổi theo với Elastic Speed AI
 * 5. Hành lang vô tận bằng teleport loop
 * 6. Dynamic subtitles khi ~8s cuối
 * 7. Kết cục: thắng (fade white) hoặc thua (Jumpscare)
 */
import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useGame from './useGame';
import useMonster from './useMonster';
import useInterface from './useInterface';

// === CONFIG CONSTANTS ===

// Vị trí xuất phát của player trong chase (đầu hành lang gần reception)
// Player chạy theo hướng âm X (x giảm dần)
export const CHASE_PLAYER_START = new THREE.Vector3(8.0, -0.2, 0);

// Monster xuất phát phía sau player
export const CHASE_MONSTER_START_OFFSET = 5.5; // units phía sau (+ X)

// Tốc độ player khi chase (cao hơn bình thường một chút)
export const CHASE_PLAYER_SPEED = 1.65;

// Monster elastic AI config
export const MONSTER_TARGET_DISTANCE = 3.0;   // khoảng cách lý tưởng monster muốn duy trì (tính từ sau lưng player)
export const MONSTER_BASE_SPEED = 1.4;         // tốc độ cơ bản (units/s)
export const MONSTER_GAP_FACTOR = 0.45;        // hệ số điều chỉnh khi lệch khỏi khoảng cách lý tưởng
export const MONSTER_CATCH_DISTANCE = 1.3;     // khoảng cách để trigger Jumpscare
export const MONSTER_MIN_SPEED = 0.5;
export const MONSTER_MAX_SPEED = 3.5;

// Hành lang loop: khi player di chuyển quá xa, teleport ngược lại
export const LOOP_START_X = 8.0;              // x tối đa (điểm bắt đầu)
export const LOOP_END_X = -40.0;              // x tối thiểu trước khi loop
export const LOOP_DISTANCE = 35.77;           // khoảng cách teleport (≈ 6 đoạn hành lang)

// Thời gian tổng
export const CHASE_DURATION = 30;             // giây

// Subtitle xuất hiện khi còn bao nhiêu giây
export const SUBTITLE_TRIGGER_TIME = 8;

export default function useChaseEnding() {
	const { camera } = useThree();

	// State selectors
	const chaseEndingActive = useGame((s) => s.chaseEndingActive);
	const setChaseEndingActive = useGame((s) => s.setChaseEndingActive);
	const setDisableControls = useGame((s) => s.setDisableControls);
	const setIsGameplayActive = useGame((s) => s.setIsGameplayActive);
	const setJumpScare = useGame((s) => s.setJumpScare);
	const setEndAnimationPlaying = useGame((s) => s.setEndAnimationPlaying);
	const isInvincible = useGame((s) => s.isInvincible);

	const setMonsterPosition = useMonster((s) => s.setMonsterPosition);
	const setMonsterRotation = useMonster((s) => s.setMonsterRotation);
	const setMonsterState = useMonster((s) => s.setMonsterState);
	const playAnimation = useMonster((s) => s.playAnimation);
	const setAnimationSpeed = useMonster((s) => s.setAnimationSpeed);

	const setFadeToBlack = useInterface((s) => s.setFadeToBlack);

	// Internal refs (không cần re-render)
	const chaseActiveRef = useRef(false);
	const timerRef = useRef(0);            // thời gian đã trôi qua kể từ "CHẠY"
	const monsterXRef = useRef(0);         // vị trí X hiện tại của monster
	const playerPositionRef = useRef(null); // reference tới playerPosition từ Movement
	const subtitleShownRef = useRef(false);
	const caughtRef = useRef(false);
	const wonRef = useRef(false);
	const countdownDoneRef = useRef(false);

	// Expose monster X to be read by Interface
	const monsterPositionVec = useRef(new THREE.Vector3(0, 10, 0));

	// Thông tin chase để Interface render
	const chaseUIRef = useRef({
		phase: 'idle',       // 'countdown' | 'running' | 'won' | 'lost'
		countdownValue: 3,   // 3,2,1,0,'ready','go'
		timeRemaining: CHASE_DURATION,
		subtitlePhase: 'none', // 'none' | 'antagonist' | 'player'
	});

	const cinematicTimeRef = useRef(0);
	const startCamPosRef = useRef(new THREE.Vector3());
	const startCamQuatRef = useRef(new THREE.Quaternion());
	const targetCamPosRef = useRef(new THREE.Vector3(CHASE_PLAYER_START.x, 1.7, CHASE_PLAYER_START.z));
	const targetCamQuatRef = useRef(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)));

	// Reset all refs khi bắt đầu lại
	const resetInternals = useCallback(() => {
		chaseActiveRef.current = false;
		timerRef.current = 0;
		cinematicTimeRef.current = 0;
		subtitleShownRef.current = false;
		caughtRef.current = false;
		wonRef.current = false;
		countdownDoneRef.current = false;
		chaseUIRef.current = {
			phase: 'idle',
			countdownValue: 3,
			timeRemaining: CHASE_DURATION,
			subtitlePhase: 'none',
		};
	}, []);

	// Trigger Jumpscare (player bị bắt)
	const triggerCaught = useCallback(() => {
		if (caughtRef.current || wonRef.current) return;
		caughtRef.current = true;
		chaseActiveRef.current = false;
		chaseUIRef.current.phase = 'lost';

		// Dùng endAnimationPlaying để trigger jumpscare giống như bình thường
		setDisableControls(true);
		setIsGameplayActive(false);

		setTimeout(() => {
			setEndAnimationPlaying(true);
		}, 200);
	}, [setDisableControls, setIsGameplayActive, setEndAnimationPlaying]);

	// Trigger thắng
	const triggerWon = useCallback(() => {
		if (caughtRef.current || wonRef.current) return;
		wonRef.current = true;
		chaseActiveRef.current = false;
		chaseUIRef.current.phase = 'won';

		setDisableControls(true);
		setIsGameplayActive(false);

		// Fade to white rồi show end screen
		setFadeToBlack(1);

		setTimeout(() => {
			setChaseEndingActive(false);
			// Dùng endAnimationPlaying=true => EndGameAnimation sẽ trigger flow thắng
			useGame.getState().setGameEndTime();
			useGame.getState().setEnd(true);
		}, 2000);
	}, [setDisableControls, setIsGameplayActive, setFadeToBlack, setChaseEndingActive]);

	// Khởi động Chase sequence
	useEffect(() => {
		if (!chaseEndingActive) {
			resetInternals();
			return;
		}

		// Disable controls
		setDisableControls(true);
		setIsGameplayActive(false);

		// Lưu vị trí hiện tại của camera cho cinematic pan
		startCamPosRef.current.copy(camera.position);
		startCamQuatRef.current.copy(camera.quaternion);

		// Đặt monster ẩn đằng sau
		monsterXRef.current = CHASE_PLAYER_START.x + CHASE_MONSTER_START_OFFSET;
		setMonsterPosition([monsterXRef.current, 0, CHASE_PLAYER_START.z]);
		setMonsterRotation([0, -Math.PI / 2, 0]);
		setMonsterState('chaseEnding');
		playAnimation('Idle'); // Đứng im lúc đầu

		monsterPositionVec.current.set(monsterXRef.current, 0, CHASE_PLAYER_START.z);

		// Bắt đầu cinematic pan
		chaseUIRef.current.phase = 'cinematic';
		window.dispatchEvent(new CustomEvent('chaseUIUpdate'));

		// Sau 2.5s cinematic pan, bắt đầu đếm ngược
		const panTimeout = setTimeout(() => {
			chaseUIRef.current.phase = 'countdown';
			chaseUIRef.current.countdownValue = 3;
			
			// Đảm bảo camera ở đúng vị trí
			camera.position.copy(targetCamPosRef.current);
			camera.quaternion.copy(targetCamQuatRef.current);

			const timings = [
				{ delay: 0,    value: 3 },
				{ delay: 1000, value: 2 },
				{ delay: 2000, value: 1 },
				{ delay: 3000, value: 'ready' },
				{ delay: 4200, value: 'go' },
			];

			const timeouts = timings.map(({ delay, value }) =>
				setTimeout(() => {
					chaseUIRef.current.countdownValue = value;
					window.dispatchEvent(new CustomEvent('chaseUIUpdate'));
				}, delay)
			);

			// Sau "GO", mở khóa điều khiển
			const startTimeout = setTimeout(() => {
				chaseUIRef.current.phase = 'running';
				chaseUIRef.current.timeRemaining = CHASE_DURATION;
				countdownDoneRef.current = true;
				chaseActiveRef.current = true;

				setDisableControls(false);
				setIsGameplayActive(true);

				window.dispatchEvent(new CustomEvent('chaseUIUpdate'));
			}, 5200);

			// Cleanup inner timeouts
			return () => {
				timeouts.forEach(clearTimeout);
				clearTimeout(startTimeout);
			};
		}, 2500);

		return () => {
			clearTimeout(panTimeout);
		};
	}, [
		chaseEndingActive,
		camera,
		setDisableControls,
		setIsGameplayActive,
		setMonsterPosition,
		setMonsterRotation,
		setMonsterState,
		playAnimation,
		resetInternals,
	]);

	// Main game loop cho Chase (chạy mỗi frame)
	useFrame((state, delta) => {
		if (!chaseEndingActive || caughtRef.current || wonRef.current) return;

		// Xử lý cinematic pan
		if (chaseUIRef.current.phase === 'cinematic') {
			cinematicTimeRef.current += delta;
			const t = Math.min(1.0, cinematicTimeRef.current / 2.5); // 2.5s pan
			
			// Easing function (ease-in-out)
			const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

			camera.position.lerpVectors(startCamPosRef.current, targetCamPosRef.current, easeT);
			camera.quaternion.slerpQuaternions(startCamQuatRef.current, targetCamQuatRef.current, easeT);
			return;
		}

		if (!chaseActiveRef.current) return;

		const playerX = camera.position.x;
		const playerZ = camera.position.z;

		// === UPDATE TIMER ===
		timerRef.current += delta;
		const timeRemaining = Math.max(0, CHASE_DURATION - timerRef.current);
		chaseUIRef.current.timeRemaining = timeRemaining;

		// === HANDLE WIN ===
		if (timeRemaining <= 0) {
			triggerWon();
			return;
		}

		// === SEAMLESS LOOP ===
		// Nếu player chạy quá xa về âm X, teleport cả player lẫn monster về gần hơn
		if (playerX < LOOP_END_X) {
			const offset = LOOP_END_X - playerX;
			camera.position.x = LOOP_START_X - offset * 0.1; // giữ gần vị trí xuất phát
			monsterXRef.current += LOOP_DISTANCE;
		}

		// === ELASTIC MONSTER AI ===
		// Monster delay 2 giây đầu tiên cho người chơi chạy trước
		if (timerRef.current > 2.0) {
			if (timerRef.current > 2.0 && timerRef.current < 2.1) {
				// Vừa hết delay, bắt đầu chạy
				playAnimation('Walk');
				setAnimationSpeed(3.5);
			}

			// Monster luôn ở sau player (player.x > monster.x vì player chạy về âm X)
			// Khoảng cách thực: monsterX - playerX (vì cả 2 đều di chuyển về âm X)
			const currentDistance = monsterXRef.current - playerX;

			// Tăng tốc dần về cuối: target distance giảm dần theo thời gian
			const progress = timerRef.current / CHASE_DURATION; // 0.0 -> 1.0
			const dynamicTargetDistance = MONSTER_TARGET_DISTANCE - (progress * 1.5); // Ép sát hơn về cuối

			// Tính tốc độ elastic
			const gap = currentDistance - dynamicTargetDistance;
			
			let monsterSpeed = MONSTER_BASE_SPEED + gap * MONSTER_GAP_FACTOR;
			// Tốc độ cơ bản cũng tăng dần
			monsterSpeed += progress * 1.0; 

			monsterSpeed = Math.max(MONSTER_MIN_SPEED, Math.min(MONSTER_MAX_SPEED, monsterSpeed));

			// Monster di chuyển về âm X (đuổi theo player)
			monsterXRef.current -= monsterSpeed * delta;
		}

		// Cập nhật vị trí monster trong scene
		setMonsterPosition([monsterXRef.current, 0, playerZ]);

		// Rotation: luôn quay mặt về hướng âm X (hướng chạy)
		setMonsterRotation([0, -Math.PI / 2, 0]);

		// Cập nhật ref để Interface có thể đọc khoảng cách
		monsterPositionVec.current.set(monsterXRef.current, 0, playerZ);

		// === DETECT CATCH ===
		if (!isInvincible && currentDistance < MONSTER_CATCH_DISTANCE) {
			triggerCaught();
			return;
		}

		// === DYNAMIC SUBTITLES (7-8s cuối) ===
		if (timeRemaining <= SUBTITLE_TRIGGER_TIME && !subtitleShownRef.current) {
			subtitleShownRef.current = true;
			chaseUIRef.current.subtitlePhase = 'antagonist';
			window.dispatchEvent(new CustomEvent('chaseUIUpdate'));

			// "TÔI : ..." xuất hiện sau 3.5s (khi câu đầu chạy xong)
			setTimeout(() => {
				if (!wonRef.current && !caughtRef.current) {
					chaseUIRef.current.subtitlePhase = 'player';
					window.dispatchEvent(new CustomEvent('chaseUIUpdate'));
				}
			}, 3500);
		}
	});

	// Trả về ref để các component khác có thể đọc trạng thái UI
	return { chaseUIRef, monsterPositionVec };
}
