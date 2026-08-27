import { useState, useEffect } from 'react';
import useGame from '../../../hooks/useGame';
import useLocalization, { languages } from '../../../hooks/useLocalization';
import './InitialFlow.css';

export default function InitialFlow({ onComplete }) {
	const [step, setStep] = useState(0); // 0: Logo, 1: Language, 2: Disclaimer
	const [logoFading, setLogoFading] = useState(false);
	const { currentLanguage, setLanguage, t } = useLocalization();

	useEffect(() => {
		if (step === 0) {
			const timer1 = setTimeout(() => {
				setLogoFading(true);
			}, 1000); // Wait 1 second before fading out

			const timer2 = setTimeout(() => {
				setStep(1);
			}, 1500); // 1s wait + 0.5s fade out

			return () => {
				clearTimeout(timer1);
				clearTimeout(timer2);
			};
		}
	}, [step]);

	const handleLanguageSelect = (code) => {
		setLanguage(code);
		setStep(2);
	};

	const handleAgree = () => {
		onComplete();
	};

	const handleDisagree = () => {
		alert('Bạn phải đồng ý để tiếp tục / You must agree to continue');
	};

	if (step === 0) {
		return (
			<div className="initial-flow-container white-bg">
				<img
					src="/logo.png"
					alt="Skull Hotel Logo"
					className={`initial-logo ${logoFading ? 'fade-out' : ''}`}
				/>
			</div>
		);
	}

	if (step === 1) {
		return (
			<div className="initial-flow-container black-bg">
				<div className="language-selection">
					<h2>CHỌN NGÔN NGỮ / SELECT LANGUAGE</h2>
					<div className="language-list">
						{languages.map((lang) => (
							<button
								key={lang.code}
								className={`lang-btn ${
									currentLanguage === lang.code ? 'active' : ''
								}`}
								onClick={() => handleLanguageSelect(lang.code)}
							>
								{lang.nativeName}
							</button>
						))}
					</div>
					<button className="continue-btn" onClick={() => setStep(2)}>
						Tiếp tục / Continue
					</button>
				</div>
			</div>
		);
	}

	if (step === 2) {
		return (
			<div className="initial-flow-container black-bg">
				<div className="disclaimer-content">
					<p>Đại sứ game kinh dị Việt Nam</p>
					<p>Tất cả các thông tin trong game đều không có thật.</p>
					<p>Game có những cảnh giật mình, ghê rợn không dành cho người yếu tim.</p>
					<p className="rating-16">Gắn mác 16+</p>
					<div className="disclaimer-buttons">
						<button onClick={handleAgree}>Toi dong tinh</button>
						<button onClick={handleDisagree}>Toi khong dong tinh</button>
					</div>
				</div>
			</div>
		);
	}

	return null;
}
