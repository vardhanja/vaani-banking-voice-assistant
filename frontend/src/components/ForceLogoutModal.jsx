import PropTypes from "prop-types";
import "./VoiceEnrollmentModal.css";

const ForceLogoutModal = ({ isOpen, onConfirm, strings }) => {
  if (!isOpen) return null;

  return (
    <div className="voice-enrollment-modal-overlay">
      <div className="voice-enrollment-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{strings.forceLogoutTitle}</h2>
        <p>{strings.forceLogoutMessage}</p>
        <p className="voice-enrollment-modal-description">{strings.forceLogoutDescription}</p>
        <div className="voice-enrollment-modal-actions">
          <button type="button" className="primary-btn" onClick={onConfirm}>
            {strings.okay}
          </button>
        </div>
      </div>
    </div>
  );
};

ForceLogoutModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  strings: PropTypes.shape({
    forceLogoutTitle: PropTypes.string.isRequired,
    forceLogoutMessage: PropTypes.string.isRequired,
    forceLogoutDescription: PropTypes.string.isRequired,
    okay: PropTypes.string.isRequired,
  }).isRequired,
};

export default ForceLogoutModal;

