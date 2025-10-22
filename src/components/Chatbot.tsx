import React, { useState, useEffect, useRef } from 'react';

export const Chatbot = () => {
  // Configuration
  const API_BASE_URL = 'http://localhost:3000';
  const ENDPOINT = '/chat/structured'; // Change to /chat/simple or /chat/tools if needed
  
  // Generate a unique session ID
  const [sessionId] = useState(() => 'user-' + Math.random().toString(36).substr(2, 9));
  
  // State
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Focus input after processing completes
  useEffect(() => {
    if (!isProcessing && isConnected && messages.length > 0) {
      // Small delay to ensure the input is re-enabled
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isProcessing, isConnected, messages.length]);

  // Start conversation by getting the first bot message
  const startConversation = async () => {
    if (messages.length > 0) return; // Don't restart if already started
    
    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'start',  // Send "start" to initiate conversation
          sessionId: sessionId,
          isInitial: true  // Flag to indicate this is the first message
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setIsTyping(false);
      
      // Add bot's initial message
      setMessages([{ text: data.response, isBot: true }]);

    } catch (err) {
      console.error('Error:', err);
      setIsTyping(false);
      setError('Failed to start conversation. Please refresh the page.');
    }
  };

  // Check backend connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
          setIsConnected(true);
          setError(null);
        } else {
          throw new Error('Backend not responding');
        }
      } catch (err) {
        setIsConnected(false);
        setError('Cannot connect to backend. Make sure the server is running on port 3000.');
      }
    };

    checkConnection();
  }, []);

  // Send message to backend
  const sendMessage = async (message) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          sessionId: sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setIsTyping(false);
      
      // Add bot response
      setMessages(prev => [...prev, { text: data.response, isBot: true }]);

      // Log collected data if available (for debugging)
      if (data.collectedData) {
        console.log('Collected Data:', data.collectedData);
      }

    } catch (err) {
      console.error('Error:', err);
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        text: 'Sorry, I encountered an error. Please make sure the backend is running.', 
        isBot: true 
      }]);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle user input
  const handleSend = () => {
    const answer = inputValue.trim();
    if (!answer || isProcessing) return;

    // Add user message to UI
    setMessages(prev => [...prev, { text: answer, isBot: false }]);
    
    // Clear input
    setInputValue('');
    
    // Send to backend
    sendMessage(answer);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isProcessing) {
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center p-5">
      <div className="w-full max-w-2xl h-[700px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-700 text-white p-5 text-center">
          <h1 className="text-xl font-semibold">Financial Advisor</h1>
          <div className="text-xs mt-2 opacity-90">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
            <span>{isConnected ? 'Connected to Claude API' : 'Backend not connected'}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
              <strong>⚠️ Connection Error</strong>
              <br />
              {error}
              <br />
              <small className="block mt-2">Run: <code className="bg-red-100 px-2 py-1 rounded">npm start</code> in your backend folder</small>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-full text-sm hover:bg-purple-700 transition"
              >
                Retry Connection
              </button>
            </div>
          )}

          {messages.length === 0 && !isTyping && isConnected && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Welcome to your Financial Advisor</h2>
              <p className="text-gray-600 mb-6">Click the button below to start answering questions</p>
              <button
                onClick={startConversation}
                className="bg-gradient-to-r from-purple-500 to-purple-700 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                Start Survey
              </button>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.isBot ? 'flex-row' : 'flex-row-reverse'} animate-fadeIn`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${
                msg.isBot ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 'bg-gray-300'
              }`}>
                {msg.isBot ? '🤖' : '👤'}
              </div>
              <div className={`max-w-[70%] px-4 py-3 rounded-2xl whitespace-pre-line ${
                msg.isBot 
                  ? 'bg-gray-100 rounded-bl-sm text-left' 
                  : 'bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-br-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start gap-3 animate-fadeIn">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 bg-gradient-to-br from-purple-500 to-purple-700">
                🤖
              </div>
              <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-5 bg-gray-50 border-t border-gray-200">
          <div className="flex gap-3 items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isConnected || isProcessing}
              placeholder="Type your answer..."
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-full text-base outline-none focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
            />
            <button
              onClick={handleSend}
              disabled={!isConnected || isProcessing}
              className="bg-gradient-to-r from-purple-500 to-purple-700 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in;
        }
      `}</style>
    </div>
  );
};