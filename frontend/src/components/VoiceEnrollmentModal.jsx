import PropTypes from "prop-types";
import "./VoiceEnrollmentModal.css";

const VoiceEnrollmentModal = ({ isOpen, onClose, onConfirm, strings }) => {
  if (!isOpen) return null;

  return (
    <div className="voice-enrollment-modal-overlay" onClick={onClose}>
      <div className="voice-enrollment-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{strings.addVoiceToAccount}</h2>
        <p>{strings.addVoicePrompt}</p>
        <p className="voice-enrollment-modal-description">{strings.addVoicePromptDescription}</p>
        <div className="voice-enrollment-modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            {strings.cancel}
          </button>
          <button type="button" className="primary-btn" onClick={onConfirm}>
            {strings.okay}
          </button>
        </div>
      </div>
    </div>
  );
};

VoiceEnrollmentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  strings: PropTypes.shape({
    addVoiceToAccount: PropTypes.string.isRequired,
    addVoicePrompt: PropTypes.string.isRequired,
    addVoicePromptDescription: PropTypes.string.isRequired,
    cancel: PropTypes.string.isRequired,
    okay: PropTypes.string.isRequired,
  }).isRequired,
};

export default VoiceEnrollmentModal;

