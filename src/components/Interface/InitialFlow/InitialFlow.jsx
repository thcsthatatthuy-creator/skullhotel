import { useState, useEffect, useRef } from 'react';
import './InitialFlow.css';

export default function InitialFlow({ onComplete }) {
	const [step, setStep] = useState(0);
	const [isMobile, setIsMobile] = useState(false);
	const [waitingForTap, setWaitingForTap] = useState(false);

	useEffect(() => {
		const mobileDetected =
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
				navigator.userAgent
			);
		setIsMobile(mobileDetected);

		if (step === 0) {
			const timer1 = setTimeout(() => {
				if (mobileDetected) {
					// Chờ người dùng bấm (Tap) để được cấp quyền xoay màn hình
					setWaitingForTap(true);
				} else {
					onComplete();
				}
			}, 2500); // Logo animation takes 2s, wait 0.5s before transitioning

			return () => clearTimeout(timer1);
		}
	}, [step, onComplete]);

	const handleTapToPlay = async () => {
		if (!waitingForTap) return;

		// Yêu cầu Fullscreen và Khóa xoay ngang
		try {
			if (document.documentElement.requestFullscreen) {
				await document.documentElement.requestFullscreen();
			}
			if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
				await window.screen.orientation.lock('landscape');
			}
		} catch (error) {
			console.log('Orientation lock failed:', error);
		}

		onComplete();
	};

	if (step === 0) {
		return (
			<div className="initial-flow-container white-bg" onClick={waitingForTap ? handleTapToPlay : undefined}>
				<img
					src="/logo.png"
					alt="Skull Hotel Logo"
					className="initial-logo"
				/>
				{waitingForTap && (
					<div style={{
						position: 'absolute',
						bottom: '15%',
						fontSize: '1.5rem',
						color: '#000',
						animation: 'pulse 1.5s infinite',
						fontWeight: 'bold',
						fontFamily: 'monospace'
					}}>
						CHẠM ĐỂ CHƠI
					</div>
				)}
			</div>
		);
	}

	return null;
}
