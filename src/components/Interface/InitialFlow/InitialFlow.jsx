import { useState, useEffect } from 'react';
import useGame from '../../../hooks/useGame';
import useLocalization, { languages } from '../../../hooks/useLocalization';
import './InitialFlow.css';

export default function InitialFlow({ onComplete }) {
	const [step, setStep] = useState(0); // 0: Logo, 1: Language, 2: Disclaimer
	const [logoFading, setLogoFading] = useState(false);
	const { currentLanguage, setLanguage, t } = useLocalization();

	const [langDropdownOpen, setLangDropdownOpen] = useState(false);

	useEffect(() => {
		if (step === 0) {
			const timer1 = setTimeout(() => {
				setStep(1);
			}, 3000); // Logo animation takes 3s total

			return () => clearTimeout(timer1);
		}
	}, [step]);

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
					className="initial-logo"
				/>
			</div>
		);
	}

	if (step === 1) {
		const selectedLang = languages.find(l => l.code === currentLanguage) || languages[0];

		return (
			<div className="initial-flow-container black-bg">
				<div className="language-selection">
					<h2>{t('ui.initialFlow.languageTitle')}</h2>
					<p className="language-subtitle">{t('ui.initialFlow.languageSubtitle')}</p>
					
					<div className="language-dropdown-container">
						<button 
							className="language-dropdown-selected"
							onClick={() => setLangDropdownOpen(!langDropdownOpen)}
						>
							{selectedLang.nativeName}
							<span className={`dropdown-arrow ${langDropdownOpen ? 'open' : ''}`}>▼</span>
						</button>
						
						{langDropdownOpen && (
							<div className="language-dropdown-list">
								{languages.map((lang) => (
									<button
										key={lang.code}
										className={`lang-dropdown-item ${currentLanguage === lang.code ? 'active' : ''}`}
										onClick={() => {
											setLanguage(lang.code);
											setLangDropdownOpen(false);
										}}
									>
										{lang.nativeName}
									</button>
								))}
							</div>
						)}
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
			<div className="initial-flow-container black-bg disclaimer-container">
				<div className="disclaimer-content">
					<h1 className="disclaimer-title">{t('ui.initialFlow.disclaimerTitle')}</h1>
					
					<p dangerouslySetInnerHTML={{ __html: t('ui.initialFlow.disclaimerIntro') }} />
					<p dangerouslySetInnerHTML={{ __html: t('ui.initialFlow.disclaimer1') }} />
					<p dangerouslySetInnerHTML={{ __html: t('ui.initialFlow.disclaimer2') }} />
					<p dangerouslySetInnerHTML={{ __html: t('ui.initialFlow.disclaimer3') }} />
					<p dangerouslySetInnerHTML={{ __html: t('ui.initialFlow.disclaimer4') }} />
					<p dangerouslySetInnerHTML={{ __html: t('ui.initialFlow.disclaimer5') }} />
					
					<p className="disclaimer-outro" dangerouslySetInnerHTML={{ __html: t('ui.initialFlow.disclaimerOutro') }} />
					
					<div className="disclaimer-buttons">
						<button onClick={handleAgree}>{t('ui.initialFlow.agree')}</button>
						<button onClick={handleDisagree}>{t('ui.initialFlow.disclaimerDisagree')}</button>
					</div>
				</div>
			</div>
		);
	}

	return null;
}
