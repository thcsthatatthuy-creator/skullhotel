import { useState, useEffect } from 'react';
import './InitialFlow.css';

export default function InitialFlow({ onComplete }) {
	const [step, setStep] = useState(0);

	useEffect(() => {
		if (step === 0) {
			const timer1 = setTimeout(() => {
				onComplete();
			}, 2500); // Logo animation takes 2s, wait 0.5s before transitioning

			return () => clearTimeout(timer1);
		}
	}, [step, onComplete]);

	if (step === 0) {
		return (
			<div className="initial-flow-container white-bg">
				<img
					src="/logo.png"
					alt="Skull Hotel Logo"
					className="initial-logo"
				/>
			</div>
		);
	}

	return null;
}
