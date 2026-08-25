import React, { useEffect, useState } from 'react';
import useGame from '../../hooks/useGame';
import useInterface from '../../hooks/useInterface';
import './AdminMenu.css';

const AdminMenu = () => {
	const isDevMode = useGame((state) => state.isDevMode);
	const setIsDevMode = useGame((state) => state.setIsDevMode);
	const isInvincible = useGame((state) => state.isInvincible);
	const setIsInvincible = useGame((state) => state.setIsInvincible);
	const setOpenDeathScreen = useGame((state) => state.setOpenDeathScreen);
	const devFastClean = useInterface((state) => state.devFastClean);

	const [sequence, setSequence] = useState([]);

	useEffect(() => {
		const handleKeyDown = (e) => {
			const key = e.key.toLowerCase();
			setSequence((prev) => {
				const nextSeq = [...prev, key].slice(-5);
				if (nextSeq.join('') === 'thien') {
					setIsDevMode(true);
				}
				return nextSeq;
			});
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [setIsDevMode]);

	if (!isDevMode) return null;

	return (
		<div
			className="admin-menu"
			onPointerDown={(e) => e.stopPropagation()}
			onClick={(e) => e.stopPropagation()}
		>
			<h3>Khóa nhà phát triển đã được bật</h3>
			<button
				className={`admin-menu-btn ${isInvincible ? 'active' : ''}`}
				onClick={() => setIsInvincible(!isInvincible)}
			>
				Bất tử: {isInvincible ? 'BẬT' : 'TẮT'}
			</button>
			<button className="admin-menu-btn" onClick={devFastClean}>
				Dọn dẹp nhanh
			</button>
			<button
				className="admin-menu-btn"
				onClick={() => {
					setOpenDeathScreen(true);
					setTimeout(() => {
						useGame.getState().restart();
						useGame.getState().setJumpScare(false);
						useInterface.getState().restart();
						// Also reset monster to hidden just in case
						import('../../hooks/useMonster').then((m) => {
							m.default.getState().restart();
						});
					}, 100);
				}}
			>
				Hy sinh
			</button>
		</div>
	);
};

export default AdminMenu;
