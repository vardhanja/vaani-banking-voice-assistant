import PropTypes from "prop-types";
import { PREFERRED_LANGUAGE_OPTIONS, LANGUAGE_MODAL_COPY } from "../config/chatCopy.js";
import { getLanguageByCode } from "../config/voiceConfig.js";

const LanguagePreferenceModal = ({ isOpen, selectedLanguage, onSelect, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="language-modal__backdrop" role="dialog" aria-modal="true">
      <div className="language-modal">
        <button type="button" className="language-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2>{LANGUAGE_MODAL_COPY.title}</h2>
        <p className="language-modal__subtitle">{LANGUAGE_MODAL_COPY.subtitle}</p>
        <div className="language-modal__options">
          {PREFERRED_LANGUAGE_OPTIONS.map((code) => {
            const option = LANGUAGE_MODAL_COPY.options[code];
            const language = getLanguageByCode(code);
            const isActive = selectedLanguage === code;
            return (
              <button
                key={code}
                type="button"
                className={`language-option ${isActive ? "language-option--active" : ""}`}
                onClick={() => onSelect(code)}
              >
                <span className="language-option__flag">{language?.flag}</span>
                <span className="language-option__label">{option?.label || language?.name}</span>
                <span className="language-option__description">{option?.description}</span>
              </button>
            );
          })}
        </div>
        <p className="language-modal__note">{LANGUAGE_MODAL_COPY.note}</p>
        <div className="language-modal__actions">
          <button type="button" className="ghost-btn" onClick={onClose}>
            {LANGUAGE_MODAL_COPY.cancelButton}
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={onConfirm}
            disabled={!selectedLanguage}
          >
            {LANGUAGE_MODAL_COPY.continueButton}
          </button>
        </div>
      </div>
    </div>
  );
};

LanguagePreferenceModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  selectedLanguage: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

LanguagePreferenceModal.defaultProps = {
  selectedLanguage: null,
};

export default LanguagePreferenceModal;
