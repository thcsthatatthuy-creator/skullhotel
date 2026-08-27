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
			}, 2000); // Wait 2 seconds before fading out

			const timer2 = setTimeout(() => {
				setStep(1);
			}, 2500); // 2s wait + 0.5s fade out

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
		alert(t('ui.initialFlow.alert'));
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
					<h2>{t('ui.initialFlow.languageTitle')}</h2>
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
						{t('ui.initialFlow.continue')}
					</button>
				</div>
			</div>
		);
	}

	if (step === 2) {
		return (
			<div className="initial-flow-container black-bg">
				<div className="disclaimer-content">
					<p>{t('ui.initialFlow.ambassador')}</p>
					<p>{t('ui.initialFlow.unreal')}</p>
					<p>{t('ui.initialFlow.warning')}</p>
					<p className="rating-16">{t('ui.initialFlow.rating')}</p>
					<div className="disclaimer-buttons">
						<button onClick={handleAgree}>{t('ui.initialFlow.agree')}</button>
						<button onClick={handleDisagree}>{t('ui.initialFlow.disagree')}</button>
					</div>
				</div>
			</div>
		);
	}

	return null;
}
