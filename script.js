document.addEventListener("DOMContentLoaded", function () {
  // Elements
  const messagesContainer = document.getElementById("messagesContainer");
  const messageInput = document.getElementById("messageInput");
  const intentInput = document.getElementById("intentInput");
  const messageInputContainer = document.getElementById(
    "messageInputContainer"
  );
  const intentInputContainer = document.getElementById("intentInputContainer");
  const nextBtn = document.getElementById("nextBtn");
  const generateBtn = document.getElementById("generateBtn");
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.querySelector(".sidebar");

  // Auto-resize textareas
  const autoResize = (textarea) => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  };

  [messageInput, intentInput].forEach((textarea) => {
    textarea.addEventListener("input", () => autoResize(textarea));
  });

  // Enhanced keyboard handling
  messageInput.addEventListener("keydown", function (e) {
    // Send on Enter (but not with Shift for newlines)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      nextBtn.click();
    }
  });

  intentInput.addEventListener("keydown", function (e) {
    // Send on Enter (but not with Shift for newlines)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      generateBtn.click();
    }
  });

  // Handle input flow
  nextBtn.addEventListener("click", () => {
    if (messageInput.value.trim() === "") {
      shakeElement(messageInput);
      return;
    }

    // Switch to intent input
    messageInputContainer.classList.add("hidden");
    intentInputContainer.classList.remove("hidden");
    nextBtn.classList.add("hidden");
    generateBtn.classList.remove("hidden");

    // Focus on intent input
    intentInput.focus();

    // Add user message to chat
    addMessage("them", messageInput.value);
  });

  // Generate response
  generateBtn.addEventListener("click", async () => {
    if (intentInput.value.trim() === "") {
      shakeElement(intentInput);
      return;
    }

    // Disable inputs during generation
    generateBtn.disabled = true;
    intentInput.disabled = true;

    // Show thinking indicator
    addThinkingIndicator();

    // Get message content
    const theirMessage = messageInput.value.trim();
    const yourIntent = intentInput.value.trim();

  

    // Call Gemini API
    let reply = "";
    try {
      // Use URL parameters instead of JSON body
      const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwzm0I_7e5N9HQDSUfTjB_ijamcyrwQeIznNzM9EyKf9EGy12mZ6MdfcdlIYZcAlPo3/exec";
      
      // Encode parameters for URL
      const encodedTheirMessage = encodeURIComponent(theirMessage);
      const encodedYourIntent = encodeURIComponent(yourIntent);
      
      // Build URL with parameters
      const urlWithParams = `${GAS_WEB_APP_URL}?theirMessage=${encodedTheirMessage}&yourIntent=${encodedYourIntent}}`;
      
      // Simple fetch options
      const requestOptions = {
        method: "POST",
        redirect: "follow"
      };
      
      const response = await fetch(urlWithParams, requestOptions);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const responseText = await response.text();
      const data = JSON.parse(responseText);
      
      // Parse the Gemini API response to get the text
      if (data && data.candidates && data.candidates[0] && 
          data.candidates[0].content && data.candidates[0].content.parts && 
          data.candidates[0].content.parts[0]) {
        reply = data.candidates[0].content.parts[0].text;
      } else {
        reply = "Sorry, couldn't generate a reply.";
      }
    } catch (error) {
      console.error("Error generating response:", error);
      reply = "Sorry, I couldn't generate a response. Please try again.";
    }

    // Remove thinking indicator
    removeThinkingIndicator();

    // Add user intent as a message
    addMessage("you", yourIntent, true);

    // Add AI response
    addMessage("ai", reply);

    // Reset inputs for new conversation
    resetInputs();
  });

  // Mobile menu toggle
  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener("click", (e) => {
    if (
      window.innerWidth <= 768 &&
      sidebar.classList.contains("active") &&
      !e.target.closest(".sidebar") &&
      !e.target.closest(".menu-toggle")
    ) {
      sidebar.classList.remove("active");
    }
  });

  // Add message to chat
  function addMessage(sender, content, isIntentOnly = false) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender === "them" ? "received" : "sent"}`;

    // Create avatar
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent =
      sender === "them" ? "👤" : sender === "ai" ? "AI" : "You";

    // Create message content
    const messageContent = document.createElement("div");
    messageContent.className = "message-content";

    // Add message text
    const paragraph = document.createElement("p");
    if (isIntentOnly) {
      paragraph.innerHTML = `<span style="opacity: 0.7; font-style: italic;">What I want to express:</span><br>${content}`;
    } else {
      paragraph.textContent = content;
    }
    messageContent.appendChild(paragraph);

    // Add timestamp
    const timestamp = document.createElement("div");
    timestamp.className = "message-time";
    timestamp.textContent = getCurrentTime();
    messageContent.appendChild(timestamp);

    // Assemble message
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);

    // Add to messages container
    messagesContainer.appendChild(messageDiv);

    // Add copy button for AI responses (below the message bubble)
    if (sender === "ai") {
      const copyBtnWrapper = document.createElement("div");
      copyBtnWrapper.className = "copy-btn-wrapper";
      const copyButton = document.createElement("button");
      copyButton.className = "copy-btn";
      copyButton.innerHTML = '<i class="fas fa-clipboard"></i>';
      copyButton.title = "Copy response";
      copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(content)
          .then(() => {
            copyButton.innerHTML = '<i class="fas fa-check"></i>';
            copyButton.classList.add("copied");
            setTimeout(() => {
              copyButton.innerHTML = '<i class="fas fa-clipboard"></i>';
              copyButton.classList.remove("copied");
            }, 2000);
            showNotification("Response copied to clipboard", 2000);
          })
          .catch(err => {
            console.error("Failed to copy: ", err);
            showNotification("Failed to copy text", 2000);
          });
      });
      copyBtnWrapper.appendChild(copyButton);
      // Insert after the messageDiv in the DOM
      messagesContainer.appendChild(copyBtnWrapper);
    }

    // Scroll to bottom
    scrollToBottom();
  }

  // Add thinking indicator
  function addThinkingIndicator() {
    const indicatorDiv = document.createElement("div");
    indicatorDiv.className = "message sent thinking-indicator";
    indicatorDiv.id = "thinkingIndicator";

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "AI";

    const messageContent = document.createElement("div");
    messageContent.className = "message-content";
    messageContent.innerHTML = `
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;

    indicatorDiv.appendChild(avatar);
    indicatorDiv.appendChild(messageContent);

    messagesContainer.appendChild(indicatorDiv);
    scrollToBottom();

    // Add typing indicator style if not already present
    if (!document.getElementById("typing-indicator-style")) {
      const style = document.createElement("style");
      style.id = "typing-indicator-style";
      style.textContent = `
                .typing-indicator {
                    display: flex;
                    align-items: center;
                }
                .typing-indicator span {
                    height: 8px;
                    width: 8px;
                    margin: 0 2px;
                    background-color: var(--text-light);
                    border-radius: 50%;
                    display: inline-block;
                    animation: typing 1.4s infinite ease-in-out;
                }
                .typing-indicator span:nth-child(1) { animation-delay: 0s; }
                .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
                .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes typing {
                    0%, 100% { transform: scale(1); opacity: 0.7; }
                    50% { transform: scale(1.2); opacity: 1; }
                }
            `;
      document.head.appendChild(style);
    }
  }

  // Remove thinking indicator
  function removeThinkingIndicator() {
    const indicator = document.getElementById("thinkingIndicator");
    if (indicator) {
      indicator.remove();
    }
  }

  // Reset inputs for new conversation
  function resetInputs() {
    // Reset inputs
    messageInput.value = "";
    intentInput.value = "";
    messageInput.style.height = "auto";
    intentInput.style.height = "auto";

    // Reset UI flow
    intentInputContainer.classList.add("hidden");
    messageInputContainer.classList.remove("hidden");
    generateBtn.classList.add("hidden");
    nextBtn.classList.remove("hidden");

    // Re-enable inputs
    generateBtn.disabled = false;
    intentInput.disabled = false;

    // Focus on message input
    messageInput.focus();
  }

  // Helper: Shake element for validation
  function shakeElement(element) {
    element.classList.add("shake");
    setTimeout(() => element.classList.remove("shake"), 600);
  }

  // Helper: Get current time
  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Helper: Scroll to bottom of messages
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Helper: Generate fake response for demo
  function generateFakeResponse(theirMessage, yourIntent) {
    // This would be replaced with actual AI API response
    const responses = [
      "I understand how you feel. I've been thinking about what you said, and I appreciate you sharing that with me. Let's find a way forward together that works for both of us.",
      "Thank you for telling me this. I really value your perspective, and I want you to know that I'm here for you. What else is on your mind?",
      "I see where you're coming from, and your feelings are completely valid. I might have approached things differently, but I respect your view and want to understand better.",
      "I've been reflecting on what you shared, and I want you to know it matters to me. Can we talk more about this when we're both free to really focus on it?",
      "That's a really interesting point. I hadn't thought about it that way before. Thanks for giving me a new perspective on this situation.",
    ];

    // Choose a random response
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Add CSS for shake animation
  const shakeStyle = document.createElement("style");
  shakeStyle.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .shake {
            animation: shake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
            border-color: #ff3b3b !important;
        }
    `;
  document.head.appendChild(shakeStyle);

  // Add notification element for keyboard shortcuts
  function showNotification(message, duration = 3000) {
    // Remove any existing notification
    const existingNotification = document.getElementById(
      "keyboard-notification"
    );
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement("div");
    notification.id = "keyboard-notification";
    notification.textContent = message;
    notification.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            z-index: 1000;
            animation: fadeInOut ${duration}ms ease;
        `;

    document.body.appendChild(notification);

    // Remove after duration
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, duration);
  }

  // Add animation for notifications
  const notificationStyle = document.createElement("style");
  notificationStyle.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, 20px); }
            10% { opacity: 1; transform: translate(-50%, 0); }
            90% { opacity: 1; transform: translate(-50%, 0); }
            100% { opacity: 0; transform: translate(-50%, -20px); }
        }
    `;
  document.head.appendChild(notificationStyle);

  // Add CSS for copy button and animation
  const copyButtonStyle = document.createElement("style");
  copyButtonStyle.textContent = `
    .copy-btn-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-top: 2px;
      margin-bottom: 10px;
      /* Place below the message bubble */
    }
    .copy-btn {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
      border: none;
      color: var(--text-light);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.7;
      transition: all 0.2s ease;
      font-size: 0.85rem;
      box-shadow: none;
      margin-top: 0;
      margin-bottom: 0;
      padding: 0;
    }
    .copy-btn:hover {
      opacity: 1;
      background: var(--primary-light);
      color: white;
    }
    .copy-btn.copied {
      background: var(--primary-light);
      color: white;
      opacity: 1;
    }
    /* Remove absolute positioning from .message-content if present */
    .message-content {
      position: relative;
    }
  `;
  document.head.appendChild(copyButtonStyle);

  // Show initial help notification
  setTimeout(() => {
    showNotification("Tip: Press Enter to send your message", 5000);
  }, 2000);

  // Focus on message input on load
  messageInput.focus();
});
