import { useState } from 'react';
import {
  sendChatMessage,
  buildUserContext,
  buildSessionId,
  formatMessageHistory,
} from '../services/chatService.js';
import { getChatCopy } from '../config/chatCopy.js';

/**
 * Hook for handling chat message sending and AI responses
 */
export const useChatHandler = ({
  session,
  language,
  isVoiceModeEnabled,
  messages,
  addUserMessage,
  addAssistantMessage,
  resetTranscript,
  setInputText,
  isListening,
  isSpeaking,
  stopListening,
  toggleListening,
  clearUnusedCards,
}) => {
  const [isTyping, setIsTyping] = useState(false);

  /**
   * Send a message and get AI response
   * @param {string} messageText - The message to send
   * @param {boolean} clearInput - Whether to clear input after sending
   */
  const sendMessage = async (messageText, options = {}) => {
    const config =
      typeof options === 'boolean'
        ? { clearInput: options }
        : { clearInput: true, displayMessage: null, ...options };

    const userFacingText = config.displayMessage || messageText;

    if (!messageText?.trim() && !userFacingText?.trim()) {
      return;
    }

    // Don't send if speaking in voice mode
    if (isVoiceModeEnabled && isSpeaking) {
      console.log('⚠️ Cannot send while speaking');
      return;
    }

    // Stop listening if currently recording
    if (isListening) {
      if (isVoiceModeEnabled) {
        stopListening();
      } else {
        toggleListening();
      }
    }

    // Clear unused cards from previous messages before adding new user message
    // This ensures old cards don't remain when user moves to a different operation
    if (clearUnusedCards && messages && messages.length > 0) {
      clearUnusedCards(userFacingText);
    }

    // Add user message
    addUserMessage(userFacingText);
    
    if (config.clearInput) {
      setInputText('');
      resetTranscript();
    }
    
    setIsTyping(true);

    try {
      // Get AI response
      const response = await sendChatMessage({
        message: messageText || userFacingText,
        userId: session.user?.id,
        sessionId: buildSessionId(session),
        language,
        userContext: buildUserContext(session),
        messageHistory: formatMessageHistory(messages),
        voiceMode: isVoiceModeEnabled,
      });

      // Determine assistant text, falling back to localized card intro when needed
      let assistantText = (response.text || '').trim();
      const cardType = response.structuredData?.type;
      if (!assistantText && cardType) {
        const cardIntro = getChatCopy(language)?.cardIntros?.[cardType];
        if (cardIntro) {
          assistantText = cardIntro;
        }
      }

      // Add assistant message with optional statement data and structured data
      addAssistantMessage(assistantText, response.statementData, response.structuredData);
    } catch (error) {
      console.error('Error in chat handler:', error);
      addAssistantMessage('Sorry, I encountered an error. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  /**
   * Handle form submit for sending messages
   */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    // inputText should come from parent component state
    // This will be called with the current inputText value
  };

  /**
   * Handle quick action button clicks
   */
  const handleQuickAction = async (action) => {
    if (!action) return;

    const displayMessage = action.prompt || action.label || '';
    const backendMessage = action.command || displayMessage;

    await sendMessage(backendMessage, {
      clearInput: false,
      displayMessage,
    });
  };

  return {
    isTyping,
    sendMessage,
    handleSendMessage,
    handleQuickAction,
  };
};
