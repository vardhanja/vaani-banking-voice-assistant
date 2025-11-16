import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";

import SunHeader from "../components/SunHeader.jsx";

const hashText = async (text) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  if (window.crypto?.subtle) {
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return window.btoa(unescape(encodeURIComponent(text)));
};

const buildFingerprintSource = () => {
  const { userAgent, language, platform } = navigator;
  const screenInfo = window.screen
    ? `${window.screen.width}x${window.screen.height}-${window.devicePixelRatio}`
    : "unknown-screen";
  return `${userAgent}::${language}::${platform}::${screenInfo}`;
};

const inferPlatform = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad")) return "ios";
  if (ua.includes("windows")) return "windows";
  if (ua.includes("mac os")) return "macos";
  return "web";
};

const mixToMono = (audioBuffer) => {
  if (audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0);
  }
  const length = audioBuffer.length;
  const result = new Float32Array(length);
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
    const data = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      result[i] += data[i];
    }
  }
  for (let i = 0; i < length; i += 1) {
    result[i] /= audioBuffer.numberOfChannels;
  }
  return result;
};

const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i += 1) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const floatTo16BitPCM = (view, offset, input) => {
  for (let i = 0; i < input.length; i += 1, offset += 2) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
};

const encodeWavBuffer = (samples, sampleRate) => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);

  return buffer;
};

const convertBlobToWav = async (blob) => {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextCtor();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const monoSamples = mixToMono(audioBuffer);
  const wavBuffer = encodeWavBuffer(monoSamples, audioBuffer.sampleRate);
  await audioContext.close();
  return { wavBlob: new Blob([wavBuffer], { type: "audio/wav" }), duration: audioBuffer.duration };
};

const MAX_RECORDING_MS = 7000;
const VOICE_PHRASE = "Sun Bank mera saathi, har kadam surakshit banking ka vaada";
const Login = ({ onAuthenticate, authenticated }) => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voiceHash, setVoiceHash] = useState("");
  const [voiceSummary, setVoiceSummary] = useState("");
  const [recordingState, setRecordingState] = useState("idle");
  const [recordingStatus, setRecordingStatus] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const voiceSectionRef = useRef(null);

  useEffect(
    () => () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
    },
    [],
  );

  useEffect(() => {
    if (!rememberDevice) {
      setVoiceMode(false);
      setVoiceBlob(null);
      setVoiceHash("");
      setVoiceSummary("");
      setRecordingStatus("");
      setRecordingState("idle");
    }
  }, [rememberDevice]);

  if (authenticated) {
    return <Navigate to="/profile" replace />;
  }

  const scrollToVoiceSection = () => {
    if (voiceSectionRef.current) {
      voiceSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const enableVoiceMode = () => {
    if (!voiceMode) {
      setVoiceMode(true);
      requestAnimationFrame(scrollToVoiceSection);
    } else {
      scrollToVoiceSection();
    }
  };

  const hashArrayBuffer = async (arrayBuffer) => {
    if (crypto?.subtle) {
      const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
    const binary = String.fromCharCode(...new Uint8Array(arrayBuffer));
    return window.btoa(binary);
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const startRecording = async () => {
    enableVoiceMode();
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingStatus("Microphone access is not supported on this device.");
      return;
    }

    setRecordingStatus("Requesting microphone access…");
    setVoiceBlob(null);
    setVoiceHash("");
    setVoiceSummary("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const { wavBlob, duration } = await convertBlobToWav(blob);
          const wavBuffer = await wavBlob.arrayBuffer();
          const hash = await hashArrayBuffer(wavBuffer);
          setVoiceBlob(wavBlob);
          setVoiceHash(hash);
          setVoiceSummary(`Sample ready · ${(duration ?? 0).toFixed(1)}s`);
          setRecordingStatus("Voice sample captured and secured.");
        } catch (processingError) {
          setRecordingStatus(
            processingError?.message || "Unable to process the voice sample.",
          );
        } finally {
          stream.getTracks().forEach((track) => track.stop());
          setRecordingState("captured");
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingState("recording");
      setRecordingStatus(`Recording… Speak clearly: "${VOICE_PHRASE}"`);
      setTimeout(() => {
        if (mediaRecorderRef.current === recorder && recorder.state === "recording") {
          stopRecording();
        }
      }, MAX_RECORDING_MS);
    } catch (permissionError) {
      setRecordingState("idle");
      setRecordingStatus(
        permissionError?.message || "Microphone permission denied by the browser.",
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!userId.trim() || !password.trim()) {
      setError("Please enter both User ID and Password to continue.");
      return;
    }

    if (rememberDevice) {
      enableVoiceMode();
      if (!voiceBlob) {
        setError(
          'Please record your voice sample by speaking "Sun Bank mera saathi, har kadam surakshit banking ka vaada".',
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const authPayload = {
        userId: userId.trim(),
        password: password.trim(),
        rememberDevice,
      };

      if (rememberDevice) {
        const fingerprintSource = buildFingerprintSource();
        const deviceIdentifier = await hashText(fingerprintSource);
        const platform = inferPlatform();

        const deviceLabel =
          platform === "android" || platform === "ios"
            ? "Mobile voice device"
            : "Web voice browser";

        authPayload.rememberDevice = true;
        authPayload.deviceIdentifier = deviceIdentifier;
        authPayload.deviceFingerprint = deviceIdentifier;
        authPayload.platform = platform;
        authPayload.deviceLabel = deviceLabel;
        authPayload.voiceSampleBlob = voiceBlob;
      } else {
        authPayload.voiceBypass = true;
      }

      const result = await onAuthenticate(authPayload);

      if (!result?.success) {
        setError(result?.message || "We could not verify those credentials. Try again.");
      }
    } catch (authError) {
      setError(
        authError?.message ||
          "Something went wrong while contacting the bank. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="app-content">
        <div className="app-gradient">
          <SunHeader subtitle="Voice-first banking, made human." />
          <main className="card-surface">
            <div className="card-hero">
              <h1>Welcome back.</h1>
              <p>Sign in to continue to your Sun National Bank profile.</p>
            </div>
            <div className="voice-binding-banner" ref={voiceSectionRef}>
              Prefer the conversation experience?{" "}
              <button type="button" className="link-btn" onClick={enableVoiceMode}>
                {voiceMode ? "Voice binding ready below" : "Use voice + device binding"}
              </button>
            </div>
            <form className="card-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="userId">
                User ID
                <input
                  id="userId"
                  name="userId"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your customer ID"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                />
              </label>
              <label htmlFor="password">
                Password
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <div className="card-form__meta">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(event) => setRememberDevice(event.target.checked)}
                  />
                  Trust this device for quick voice authentication
                </label>
                <a className="muted-link" href="#help">
                  Need help signing in?
                </a>
              </div>
              {voiceMode && (
                <div className="card-form__voice">
                  <p className="profile-hint">
                    Speak the passphrase <strong>"{VOICE_PHRASE}"</strong> so we can verify your
                    voice on each login.
                  </p>
                  <div className="voice-controls">
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={recordingState === "recording" ? stopRecording : startRecording}
                    >
                      {recordingState === "recording" ? "Stop recording" : "Record voice sample"}
                    </button>
                    {voiceSummary && (
                      <span className="profile-hint">
                        {voiceSummary}
                        {voiceHash && (
                          <>
                            {" "}
                            · Hash: <code>{voiceHash.slice(0, 12)}…</code>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  {recordingStatus && <p className="profile-hint">{recordingStatus}</p>}
                </div>
              )}
              {error && <div className="form-error">{error}</div>}
              <button className="primary-btn" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Verifying…" : "Log in"}
              </button>
            </form>
          </main>
        </div>
      </div>
      <footer className="app-footer">
        © {new Date().getFullYear()} Sun National Bank · RBI compliant · Made for Bharat
      </footer>
    </div>
  );
};

Login.propTypes = {
  onAuthenticate: PropTypes.func.isRequired,
  authenticated: PropTypes.bool,
};

Login.defaultProps = {
  authenticated: false,
};

export default Login;


