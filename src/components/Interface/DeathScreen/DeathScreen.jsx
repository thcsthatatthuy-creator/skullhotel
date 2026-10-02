import React, { useState, useEffect } from 'react';
import useGame from '../../../hooks/useGame';
import useInterface from '../../../hooks/useInterface';
import useGridStore from '../../../hooks/useGrid';
import useDoor from '../../../hooks/useDoor';
import useMonster from '../../../hooks/useMonster';
import useLight from '../../../hooks/useLight';
import useLocalization from '../../../hooks/useLocalization';
import levelData from '../../../components/Monster/Triggers/levelData';
import { regenerateData } from '../../../utils/config';
import {
	isPointerLocked,
	exitPointerLock,
	requestPointerLock,
} from '../../../utils/pointerLock';
import AnimatedDeathLogo from './AnimatedDeathLogo';

import './DeathScreen.css';

function resetGame() {
	useGame.getState().restart();
	useInterface.getState().restart();
	useDoor.getState().restart();
	useMonster.getState().restart();
	useGame.getState().setPlayIntro(true);
	useLight.getState().restart();
	useInterface.getState().setIsSettingsOpen(false);
	useInterface.getState().setTutorialObjectives([true, true, true]);
}

const DeathScreen = () => {
	const [isRestarting, setIsRestarting] = useState(false);
	const [lastDeathMessage, setLastDeathMessage] = useState(null);
	const [animationsComplete, setAnimationsComplete] = useState(false);
	const [capturedDeathData, setCapturedDeathData] = useState(null);
	const { t } = useLocalization();
	const deviceMode = useGame((state) => state.deviceMode);
	const openDeathScreen = useGame((state) => state.openDeathScreen);
	const setOpenDeathScreen = useGame((state) => state.setOpenDeathScreen);
	const incrementRealDeaths = useGame((state) => state.incrementRealDeaths);
	const setIsGameplayActive = useGame((state) => state.setIsGameplayActive);
	const playerPositionRoom = useGame((state) => state.playerPositionRoom);
	const seedData = useGame((state) => state.seedData);
	const customMessage = useGame((state) => state.customDeathMessage);
	const seenLevels = useGame((state) => state.seenLevels);
	const totalLevelTypes = useGame((state) => state.totalLevelTypes);
	const addSeenLevel = useGame((state) => state.addSeenLevel);

	// He thong hoi sinh
	const reviveUsed = useGame((state) => state.reviveUsed);
	const setReviveUsed = useGame((state) => state.setReviveUsed);
	const revive = useGame((state) => state.revive);

	useEffect(() => {
		if (openDeathScreen) {
			setAnimationsComplete(false);
			const timer = setTimeout(() => {
				setAnimationsComplete(true);
			}, 3500);
			return () => clearTimeout(timer);
		}
	}, [openDeathScreen]);

	useEffect(() => {
		if (
			openDeathScreen &&
			!capturedDeathData &&
			playerPositionRoom !== null &&
			playerPositionRoom >= 0
		) {
			setCapturedDeathData({ playerPositionRoom, seedData, customMessage });
		} else if (!openDeathScreen && capturedDeathData) {
			setCapturedDeathData(null);
		}
	}, [openDeathScreen, playerPositionRoom, seedData, customMessage, capturedDeathData]);

	useEffect(() => {
		if (capturedDeathData) {
			const seedDataEntries = Object.entries(capturedDeathData.seedData);
			const [roomKey, currentRoom] = seedDataEntries[capturedDeathData.playerPositionRoom] || [];
			let message = null;
			if (capturedDeathData.customMessage) {
				message = capturedDeathData.customMessage.startsWith('game.deathReasons.')
					? t(capturedDeathData.customMessage)
					: capturedDeathData.customMessage;
			} else {
				const baseKey = currentRoom?.baseKey || roomKey;
				if (baseKey) {
					message = t(`game.deathReasons.${baseKey}`);
				}
			}
			setLastDeathMessage(message);
		}
	}, [capturedDeathData, t]);

	useEffect(() => {
		if (playerPositionRoom !== null && playerPositionRoom >= 0) {
			const currentRoom = Object.values(seedData)[playerPositionRoom];
			if (currentRoom?.baseKey) {
				addSeenLevel(currentRoom.baseKey);
			}
		}
	}, [playerPositionRoom, seedData, addSeenLevel]);

	useEffect(() => {
		if (openDeathScreen) {
			if (isPointerLocked()) exitPointerLock();
			const preventPointerLock = (e) => {
				if (!animationsComplete) {
					e.preventDefault();
					exitPointerLock();
				}
			};
			document.addEventListener('pointerlockchange', preventPointerLock);
			return () => document.removeEventListener('pointerlockchange', preventPointerLock);
		}
	}, [openDeathScreen, animationsComplete]);

	useEffect(() => {
		if (openDeathScreen) {
			setIsGameplayActive(false);
			useMonster.getState().restart();
		}
	}, [openDeathScreen, setIsGameplayActive]);

	useEffect(() => {
		if (!openDeathScreen || deviceMode !== 'gamepad') return;
		const checkGamepadXButton = () => {
			const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
			for (const gamepad of gamepads) {
				if (gamepad && gamepad.connected) {
					const actionPressed =
						gamepad.buttons[0]?.pressed ||
						gamepad.buttons[2]?.pressed ||
						gamepad.buttons[6]?.pressed ||
						gamepad.buttons[7]?.pressed;
					if (actionPressed && !isRestarting && animationsComplete) {
						setIsRestarting(true);
						setTimeout(() => {
							if (!reviveUsed) {
								setReviveUsed(true);
								revive();
								useMonster.getState().restart();
								setTimeout(() => {
									setIsGameplayActive(true);
									setOpenDeathScreen(false);
									setIsRestarting(false);
								}, 100);
							} else {
								resetGame();
								regenerateData();
								useGridStore.getState().initializeIfNeeded();
								setTimeout(() => {
									setIsGameplayActive(true);
									setOpenDeathScreen(false);
									setIsRestarting(false);
									setTimeout(() => {
										useInterface.getState().setCurrentDialogueIndex(1);
										setTimeout(() => useInterface.getState().setCurrentDialogueIndex(null), 3000);
									}, 1500);
								}, 100);
							}
						}, 500);
					}
				}
			}
		};
		const interval = setInterval(checkGamepadXButton, 100);
		return () => clearInterval(interval);
	}, [openDeathScreen, deviceMode, setOpenDeathScreen, isRestarting, setIsGameplayActive, animationsComplete, reviveUsed, setReviveUsed, revive]);

	const handleRestart = () => {
		if (isRestarting || !animationsComplete) return;
		setIsRestarting(true);
		incrementRealDeaths();
		if (!reviveUsed) {
			// LAN CHET DAU: HOI SINH TAI CHO, GIU NGUYEN TIEN DO
			setReviveUsed(true);
			revive();
			useMonster.getState().restart();
			setTimeout(() => {
				setOpenDeathScreen(false);
				setIsRestarting(false);
				setIsGameplayActive(true);
				if (deviceMode === 'keyboard') {
					const canvas = document.querySelector('canvas');
					if (canvas && !isPointerLocked()) requestPointerLock(canvas);
				}
			}, 100);
		} else {
			// LAN CHET 2+: RESTART HOAN TOAN
			resetGame();
			regenerateData();
			useGridStore.getState().initializeIfNeeded();
			setTimeout(() => {
				setOpenDeathScreen(false);
				setIsRestarting(false);
				setIsGameplayActive(true);
				if (deviceMode === 'keyboard') {
					const canvas = document.querySelector('canvas');
					if (canvas && !isPointerLocked()) requestPointerLock(canvas);
				}
				setTimeout(() => {
					useInterface.getState().setCurrentDialogueIndex(1);
					setTimeout(() => useInterface.getState().setCurrentDialogueIndex(null), 3000);
				}, 1500);
			}, 100);
		}
	};

	if (!openDeathScreen) return null;

	return (
		<>
			<div className="death-screen" onClick={handleRestart}>
				<AnimatedDeathLogo />
				<div className="death-screen-flex">
					<div className="death-screen-title">
						{t('ui.deathScreen.youDied')}
					</div>
					<div className="death-message">
						{lastDeathMessage}
						<div className="death-message-count">
							{seenLevels.size}/{totalLevelTypes}{' '}
							{t('ui.deathScreen.hidingSpotsFound')}
						</div>
					</div>
				</div>
				<div className="death-screen-start-container">
					<div className="death-screen-start">
						{isRestarting
							? t('ui.deathScreen.restarting')
							: !reviveUsed
							? '\u2726 H\u1ed3i Sinh \u2726'
							: t('ui.deathScreen.continue')}
					</div>
					{!reviveUsed && !isRestarting && (
						<div style={{ fontSize: '0.7em', opacity: 0.6, marginTop: '0.3rem', fontStyle: 'italic' }}>
							(Nh\u1ea5n \u0111\u1ec3 h\u1ed3i sinh t\u1ea1i ch\u1ed7 \u2014 ch\u1ec9 1 l\u1ea7n)
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default DeathScreen;
