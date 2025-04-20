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
  const chatList = document.getElementById("chatList");
  const newChatBtn = document.querySelector(".new-chat-btn");

  let conversations = [];
  let activeConversationId = null;
  let themeMode = localStorage.getItem("pyintelTheme") || "light";

  // Apply saved theme on load
  document.body.classList.add(
    themeMode === "dark" ? "dark-theme" : "light-theme"
  );

  // Theme toggle function
  function toggleTheme() {
    themeMode = themeMode === "light" ? "dark" : "light";
    document.body.classList.toggle("dark-theme");
    document.body.classList.toggle("light-theme");
    localStorage.setItem("pyintelTheme", themeMode);
  }

  // Add theme toggle button to sidebar
  const themeToggle = document.createElement("button");
  themeToggle.className = "theme-toggle";
  themeToggle.innerHTML = `<i class="fas fa-${themeMode === "light" ? "moon" : "sun"}"></i>`;
  themeToggle.setAttribute(
    "title",
    `Switch to ${themeMode === "light" ? "dark" : "light"} theme`
  );
  themeToggle.addEventListener("click", function () {
    toggleTheme();
    this.innerHTML = `<i class="fas fa-${themeMode === "light" ? "moon" : "sun"}"></i>`;
    this.setAttribute(
      "title",
      `Switch to ${themeMode === "light" ? "dark" : "light"} theme`
    );
  });

  // Insert theme toggle after the sidebar header
  const sidebarHeader = document.querySelector(".sidebar-header");
  if (sidebarHeader) {
    sidebarHeader.after(themeToggle);
  }

  // Auto-resize textareas
  const autoResize = (textarea) => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  };

  [messageInput, intentInput].forEach((textarea) => {
    textarea.addEventListener("input", () => autoResize(textarea));
  });

  // Add confetti effect for successful generation
  function showConfetti() {
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    document.body.appendChild(confettiContainer);
    
    for (let i = 0; i < 30; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.animationDelay = Math.random() * 3 + 's';
      confetti.style.background = `hsl(${Math.random() * 360}, 100%, 50%)`;
      confettiContainer.appendChild(confetti);
    }
    
    setTimeout(() => confettiContainer.remove(), 3000);
  }
  
  // Add avatar emoji variation based on conversation ID for visual variety
  function getAvatarEmoji(conversationId, sender) {
    if (sender === "ai") return '<i class="fas fa-robot"></i>';
    if (sender === "you") return '<i class="fas fa-user"></i>';
    
    // For "them" sender, generate different emojis based on conversationId hash
    const emojis = ["👤", "👩", "👨", "👱‍♀️", "👱", "👧", "👦", "👵", "👴", "👲"];
    const hash = conversationId ? 
      conversationId.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % emojis.length :
      0;
    
    return emojis[hash];
  }

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

  // --- Initialization ---
  loadConversations();
  renderChatList();
  // Activate the first chat or create a new one if none exist
  if (conversations.length > 0) {
    switchChat(conversations[0].id);
  } else {
    createNewChat();
  }

  // --- Core Functions ---

  function loadConversations() {
    const storedConversations = localStorage.getItem("pyintelConversations");
    if (storedConversations) {
      try {
        conversations = JSON.parse(storedConversations);
        // Ensure messages array exists for each convo
        conversations.forEach(
          (convo) => (convo.messages = convo.messages || [])
        );
      } catch (e) {
        console.error("Error parsing stored conversations:", e);
        conversations = [];
      }
    } else {
      conversations = [];
    }
    // Assign unique IDs if they don't exist (simple approach)
    conversations.forEach((convo, index) => {
      if (!convo.id) convo.id = `chat-${Date.now()}-${index}`;
    });
  }

  function saveConversations() {
    try {
      localStorage.setItem(
        "pyintelConversations",
        JSON.stringify(conversations)
      );
    } catch (e) {
      console.error("Error saving conversations:", e);
      // Handle potential storage limit issues
    }
  }

  function getConversation(id) {
    return conversations.find((convo) => convo.id === id);
  }

  function renderChatList() {
    chatList.innerHTML = ""; // Clear existing list
    if (conversations.length === 0) {
      chatList.innerHTML =
        '<div class="empty-state"><i class="fas fa-comments"></i><p>No conversations yet.</p></div>';
      return;
    }

    conversations.forEach((convo) => {
      const chatItem = document.createElement("div");
      chatItem.className = `chat-item ${
        convo.id === activeConversationId ? "active" : ""
      }`;
      chatItem.dataset.id = convo.id; // Store ID for click handling

      const lastMessage =
        convo.messages.length > 0
          ? convo.messages[convo.messages.length - 1]
          : null;
      const previewText = lastMessage
        ? lastMessage.content.length > 30
          ? lastMessage.content.substring(0, 30) + "..."
          : lastMessage.content
        : "Start a new conversation...";
      const timeText = lastMessage
        ? formatTimestamp(lastMessage.timestamp)
        : "now";

      chatItem.innerHTML = `
                <div class="chat-avatar">
                  <i class="fas fa-comment-alt"></i>
                </div>
                <div class="chat-info">
                    <div class="chat-name">
                      <span class="chat-title">${convo.name || `Chat ${convo.id.substring(0, 5)}`}</span>
                      <div class="chat-actions">
                        <button class="edit-chat-btn" title="Rename chat"><i class="fas fa-pencil-alt"></i></button>
                        <button class="delete-chat-btn" title="Delete chat"><i class="fas fa-trash-alt"></i></button>
                      </div>
                    </div>
                    <div class="chat-preview">${previewText}</div>
                </div>
                <div class="chat-time">${timeText}</div>
            `;

      chatItem
        .querySelector(".chat-title")
        .addEventListener("click", () => switchChat(convo.id));
      chatItem
        .querySelector(".chat-preview")
        .addEventListener("click", () => switchChat(convo.id));
      chatItem
        .querySelector(".chat-avatar")
        .addEventListener("click", () => switchChat(convo.id));

      // Add rename functionality
      chatItem
        .querySelector(".edit-chat-btn")
        .addEventListener("click", (e) => {
          e.stopPropagation();
          renameConversation(convo.id);
        });

      // Add delete functionality
      chatItem
        .querySelector(".delete-chat-btn")
        .addEventListener("click", (e) => {
          e.stopPropagation();
          confirmDeleteConversation(convo.id);
        });

      chatList.appendChild(chatItem);
    });
  }

  // Function to rename a conversation
  function renameConversation(conversationId) {
    const conversation = getConversation(conversationId);
    if (!conversation) return;

    const newName = prompt(
      "Enter a new name for this conversation:",
      conversation.name
    );
    if (newName !== null && newName.trim() !== "") {
      conversation.name = newName.trim();
      saveConversations();
      renderChatList();
    }
  }

  // Function to confirm and delete a conversation
  function confirmDeleteConversation(conversationId) {
    const confirmation = confirm(
      "Are you sure you want to delete this conversation? This cannot be undone."
    );
    if (confirmation) {
      deleteConversation(conversationId);
    }
  }

  // Function to delete a conversation
  function deleteConversation(conversationId) {
    const index = conversations.findIndex((convo) => convo.id === conversationId);
    if (index !== -1) {
      conversations.splice(index, 1);
      saveConversations();

      // If we deleted the active conversation, switch to another one
      if (activeConversationId === conversationId) {
        if (conversations.length > 0) {
          switchChat(conversations[0].id);
        } else {
          createNewChat();
        }
      } else {
        renderChatList();
      }

      showNotification("Conversation deleted", 2000);
    }
  }

  function renderMessages(conversationId) {
    messagesContainer.innerHTML = ""; // Clear existing messages
    const conversation = getConversation(conversationId);
    if (!conversation) return;

    // Add conversation title at the top
    const titleElement = document.createElement("div");
    titleElement.className = "conversation-title";
    titleElement.innerHTML = `
      <h2>${conversation.name || `Chat ${conversation.id.substring(0, 5)}`}</h2>
      <div class="conversation-date">${formatDate(conversation.createdAt)}</div>
    `;
    messagesContainer.appendChild(titleElement);

    // Add initial hint/welcome if conversation is empty
    if (conversation.messages.length === 0) {
      messagesContainer.innerHTML += `
                <div class="welcome-container">
                  <div class="message received">
                      <div class="message-avatar"><i class="fas fa-robot"></i></div>
                      <div class="message-content">
                          <p>Hello! I'm your Pyintel Assistant. How can I help you today?</p>
                          <div class="message-time">${getCurrentTime()}</div>
                      </div>
                  </div>
                  <div class="hint-message">
                      <i class="fas fa-info-circle"></i>
                      <p>Share a message that you received and what you want to say in response.</p>
                  </div>
                </div>`;
    } else {
      conversation.messages.forEach((msg) => {
        // Call your existing addMessage logic, but prevent it from modifying the array again
        addMessageToDOM(msg.sender, msg.content, msg.isIntentOnly, msg.timestamp);
      });
    }
    scrollToBottom();
  }

  function switchChat(conversationId) {
    if (
      activeConversationId === conversationId &&
      getConversation(conversationId)
    )
      return; // Already active

    // Add transition effect
    messagesContainer.classList.add("fade-out");

    setTimeout(() => {
      activeConversationId = conversationId;
      renderChatList(); // Update active state in sidebar
      renderMessages(conversationId);
      resetInputs(); // Reset composer state

      // Show active indicator in mobile view
      document.querySelector(".app-title").innerHTML = `
        <span>${getConversation(conversationId)?.name || "Chat"}</span>
        <span class="active-indicator"></span>
      `;

      // Remove transition class
      messagesContainer.classList.remove("fade-out");
      messageInput.focus();

      if (window.innerWidth <= 768) {
        sidebar.classList.remove("active"); // Close sidebar on mobile after selection
      }

      console.log(`Switched to chat: ${conversationId}`);
    }, 150); // Short delay for transition
  }

  function createNewChat() {
    const newId = `chat-${Date.now()}`;
    const newConvo = {
      id: newId,
      name: `New Chat ${conversations.length + 1}`, // Simple naming
      messages: [],
      createdAt: Date.now(),
    };
    conversations.unshift(newConvo); // Add to beginning
    activeConversationId = newId;
    saveConversations();

    // Add animation
    chatList.classList.add("updating");
    setTimeout(() => {
      renderChatList();
      renderMessages(newId);
      resetInputs();
      messageInput.focus();
      chatList.classList.remove("updating");
    }, 300);

    console.log(`Created new chat: ${newId}`);
  }

  // Format timestamps nicely
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // If less than a day, show time
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    // If less than a week, show day name
    else if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    // Otherwise, show short date
    else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  }

  // Format date more fully
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // --- Modified Event Handlers ---

  newChatBtn.addEventListener("click", createNewChat); // Add listener for new chat button

  nextBtn.addEventListener("click", () => {
    if (messageInput.value.trim() === "" || !activeConversationId) {
      shakeElement(messageInput);
      return;
    }
    const conversation = getConversation(activeConversationId);
    if (!conversation) return; // Should not happen if activeConversationId is set

    // Add user message to the *active* conversation's data
    addMessageToConversation("them", messageInput.value);

    // Switch UI
    messageInputContainer.classList.add("hidden");
    intentInputContainer.classList.remove("hidden");
    nextBtn.classList.add("hidden");
    generateBtn.classList.remove("hidden");
    intentInput.focus();

    // Render the message just added
    addMessageToDOM("them", messageInput.value);
    scrollToBottom();
    // No need to reset messageInput here yet
  });

  generateBtn.addEventListener("click", async () => {
    if (intentInput.value.trim() === "" || !activeConversationId) {
      shakeElement(intentInput);
      return;
    }
    const conversation = getConversation(activeConversationId);
    if (!conversation) return;

    // Add user intent to conversation data
    addMessageToConversation("you", intentInput.value, true);
    // Render intent
    addMessageToDOM("you", intentInput.value, true);

    generateBtn.disabled = true;
    intentInput.disabled = true;
    addThinkingIndicator();

    const theirMessage =
      conversation.messages.find((msg) => msg.sender === "them")?.content ||
      messageInput.value.trim(); // Get original message if needed
    const yourIntent = intentInput.value.trim();

    // Call Gemini API
    let reply = "";
    try {
      const GAS_WEB_APP_URL =
        "https://script.google.com/macros/s/AKfycbwzm0I_7e5N9HQDSUfTjB_ijamcyrwQeIznNzM9EyKf9EGy12mZ6MdfcdlIYZcAlPo3/exec";

      const encodedTheirMessage = encodeURIComponent(theirMessage);
      const encodedYourIntent = encodeURIComponent(yourIntent);

      const urlWithParams = `${GAS_WEB_APP_URL}?theirMessage=${encodedTheirMessage}&yourIntent=${encodedYourIntent}`;

      const requestOptions = {
        method: "POST",
        redirect: "follow",
      };

      const response = await fetch(urlWithParams, requestOptions);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);

      if (
        data &&
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0]
      ) {
        reply = data.candidates[0].content.parts[0].text;
        showConfetti(); // Add confetti animation when generation is successful
      } else {
        reply = "Sorry, couldn't generate a reply.";
      }
    } catch (error) {
      console.error("Error generating response:", error);
      reply = "Sorry, I couldn't generate a response. Please try again.";
    }

    removeThinkingIndicator();

    addMessageToConversation("ai", reply);
    addMessageToDOM("ai", reply);

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

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent =
      sender === "them" ? "👤" : sender === "ai" ? "AI" : "You";

    const messageContent = document.createElement("div");
    messageContent.className = "message-content";

    const paragraph = document.createElement("p");
    if (isIntentOnly) {
      paragraph.innerHTML = `<span style="opacity: 0.7; font-style: italic;">What I want to express:</span><br>${content}`;
    } else {
      paragraph.textContent = content;
    }
    messageContent.appendChild(paragraph);

    const timestamp = document.createElement("div");
    timestamp.className = "message-time";
    timestamp.textContent = getCurrentTime();
    messageContent.appendChild(timestamp);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);

    messagesContainer.appendChild(messageDiv);

    if (sender === "ai") {
      const copyBtnWrapper = document.createElement("div");
      copyBtnWrapper.className = "copy-btn-wrapper";
      const copyButton = document.createElement("button");
      copyButton.className = "copy-btn";
      copyButton.innerHTML = '<i class="fas fa-clipboard"></i>';
      copyButton.title = "Copy response";
      copyButton.addEventListener("click", () => {
        navigator.clipboard
          .writeText(content)
          .then(() => {
            copyButton.innerHTML = '<i class="fas fa-check"></i>';
            copyButton.classList.add("copied");
            setTimeout(() => {
              copyButton.innerHTML = '<i class="fas fa-clipboard"></i>';
              copyButton.classList.remove("copied");
            }, 2000);
            showNotification("Response copied to clipboard", 2000);
          })
          .catch((err) => {
            console.error("Failed to copy: ", err);
            showNotification("Failed to copy text", 2000);
          });
      });
      copyBtnWrapper.appendChild(copyButton);
      messagesContainer.appendChild(copyBtnWrapper);
    }

    scrollToBottom();
  }

  function addMessageToConversation(sender, content, isIntentOnly = false) {
    const conversation = getConversation(activeConversationId);
    if (!conversation) return;

    const message = {
      sender,
      content,
      isIntentOnly,
      timestamp: Date.now(),
    };
    conversation.messages.push(message);
    saveConversations();
  }

  function addMessageToDOM(sender, content, isIntentOnly = false, timestamp) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender === "them" ? "received" : "sent"}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    
    // Use custom avatars based on sender
    avatar.innerHTML = getAvatarEmoji(activeConversationId, sender);

    const messageContent = document.createElement("div");
    messageContent.className = "message-content";

    const paragraph = document.createElement("p");
    if (isIntentOnly) {
      paragraph.innerHTML = `<span style="opacity: 0.7; font-style: italic;">What I want to express:</span><br>${content}`;
    } else {
      paragraph.textContent = content;
    }
    messageContent.appendChild(paragraph);

    const timeDiv = document.createElement("div");
    timeDiv.className = "message-time";
    timeDiv.textContent = timestamp
      ? new Date(timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : getCurrentTime();
    messageContent.appendChild(timeDiv);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);

    messagesContainer.appendChild(messageDiv);

    if (sender === "ai") {
      const copyBtnWrapper = document.createElement("div");
      copyBtnWrapper.className = "copy-btn-wrapper";
      const copyButton = document.createElement("button");
      copyButton.className = "copy-btn";
      copyButton.innerHTML = '<i class="fas fa-clipboard"></i>';
      copyButton.title = "Copy response";
      copyButton.addEventListener("click", () => {
        navigator.clipboard
          .writeText(content)
          .then(() => {
            copyButton.innerHTML = '<i class="fas fa-check"></i>';
            copyButton.classList.add("copied");
            setTimeout(() => {
              copyButton.innerHTML = '<i class="fas fa-clipboard"></i>';
              copyButton.classList.remove("copied");
            }, 2000);
            showNotification("Response copied to clipboard", 2000);
          })
          .catch((err) => {
            console.error("Failed to copy: ", err);
            showNotification("Failed to copy text", 2000);
          });
      });
      copyBtnWrapper.appendChild(copyButton);
      messagesContainer.appendChild(copyBtnWrapper);
    }

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
    messageInput.value = "";
    intentInput.value = "";
    messageInput.style.height = "auto";
    intentInput.style.height = "auto";

    intentInputContainer.classList.add("hidden");
    messageInputContainer.classList.remove("hidden");
    generateBtn.classList.add("hidden");
    nextBtn.classList.remove("hidden");

    generateBtn.disabled = false;
    intentInput.disabled = false;

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
    const existingNotification = document.getElementById(
      "keyboard-notification"
    );
    if (existingNotification) {
      existingNotification.remove();
    }

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

  // Add CSS for enhanced visuals - replace the existing enhancedStyles content
  const enhancedStyles = document.createElement("style");
  enhancedStyles.textContent = `
    /* Light/Dark Theme Support with enhanced colors */
    :root {
      --primary: #4361ee;
      --primary-light: #4895ef;
      --primary-dark: #3a0ca3;
      --accent: #f72585;
      --accent-light: #ff4d6d; 
      --gradient-start: #4361ee;
      --gradient-end: #3a0ca3;
      --text: #2b2d42;
      --text-light: #6c757d;
      --text-on-primary: #ffffff;
      --bg-main: #f8f9fa;
      --bg-light: #ffffff;
      --bg-dark: #e9ecef;
      --border: #dee2e6;
      --shadow: rgba(0, 0, 0, 0.05);
      --shadow-hover: rgba(0, 0, 0, 0.1);
      --shadow-card: rgba(0, 0, 0, 0.07);
      --shadow-float: rgba(67, 97, 238, 0.15);
    }
    
    .dark-theme {
      --primary: #4895ef;
      --primary-light: #4cc9f0;
      --primary-dark: #3a0ca3;
      --accent: #f72585;
      --accent-light: #ff4d6d;
      --gradient-start: #4895ef;
      --gradient-end: #3a0ca3;
      --text: #f8f9fa;
      --text-light: #adb5bd;
      --text-on-primary: #ffffff;
      --bg-main: #151515;
      --bg-light: #212121;
      --bg-dark: #0a0a0a;
      --border: #2d2d2d;
      --shadow: rgba(0, 0, 0, 0.2);
      --shadow-hover: rgba(0, 0, 0, 0.35);
      --shadow-card: rgba(0, 0, 0, 0.3);
      --shadow-float: rgba(67, 97, 238, 0.25);
    }
    
    body {
      transition: background-color 0.3s ease, color 0.3s ease;
      background-color: var(--bg-main);
      color: var(--text);
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    }
    
    /* App Container Modernization */
    .app-container {
      position: relative;
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
      display: flex;
      background-color: var(--bg-main);
    }
    
    /* Sidebar Improvements */
    .sidebar {
      background: var(--bg-light);
      border-right: 1px solid var(--border);
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      box-shadow: 0 0 20px var(--shadow);
      z-index: 100;
      display: flex;
      flex-direction: column;
    }
    
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--border);
    }
    
    .sidebar-header h2 {
      font-weight: 700;
      background: linear-gradient(to right, var(--gradient-start), var(--gradient-end));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 1.3rem;
      letter-spacing: -0.5px;
    }
    
    /* Chat Items Styling */
    .chat-item {
      margin: 8px 12px;
      padding: 14px;
      border-radius: 12px;
      transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
      border: 1px solid transparent;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      cursor: pointer;
    }
    
    .chat-item:hover {
      background: var(--bg-dark);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px var(--shadow);
    }
    
    .chat-item.active {
      background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
      color: var(--text-on-primary);
      border: none;
      box-shadow: 0 5px 15px var(--shadow-float);
    }
    
    .chat-item.active .chat-preview,
    .chat-item.active .chat-time {
      color: rgba(255, 255, 255, 0.85);
    }
    
    .chat-name {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    
    .chat-title {
      font-weight: 600;
      flex: 1;
      font-size: 0.95rem;
      letter-spacing: -0.3px;
    }
    
    .chat-actions {
      display: flex;
      gap: 6px;
      opacity: 0;
      transition: opacity 0.2s ease;
      margin-left: 8px;
    }
    
    .chat-item:hover .chat-actions {
      opacity: 1;
    }
    
    .edit-chat-btn, 
    .delete-chat-btn {
      background: none;
      border: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: inherit;
      opacity: 0.7;
      transition: all 0.2s ease;
    }
    
    .edit-chat-btn:hover, 
    .delete-chat-btn:hover {
      opacity: 1;
      background: rgba(0,0,0,0.1);
      transform: scale(1.1);
    }
    
    .chat-item.active .edit-chat-btn:hover, 
    .chat-item.active .delete-chat-btn:hover {
      background: rgba(255,255,255,0.2);
    }
    
    .chat-preview {
      font-size: 0.85rem;
      color: var(--text-light);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 0.9;
      max-width: 220px;
    }
    
    .chat-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, var(--primary-light), var(--primary-dark));
      color: var(--text-on-primary);
      border-radius: 10px;
      margin-right: 12px;
      flex-shrink: 0;
      box-shadow: 0 3px 8px var(--shadow-card);
      font-size: 1.1rem;
    }
    
    .chat-item.active .chat-avatar {
      background: rgba(255, 255, 255, 0.9);
      color: var(--primary);
      box-shadow: 0 3px 8px rgba(0,0,0,0.15);
    }
    
    /* Empty state and new chat enhancements */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      opacity: 0.7;
      text-align: center;
      height: 300px;
    }
    
    .empty-state i {
      font-size: 3.5rem;
      margin-bottom: 15px;
      background: linear-gradient(to right, var(--primary-light), var(--accent-light));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .empty-state p {
      font-weight: 500;
      color: var(--text-light);
    }
    
    /* New Chat Button Improvement */
    .new-chat-btn {
      background: linear-gradient(135deg, var(--primary), var(--primary-light));
      color: white;
      transition: all 0.3s ease;
      border-radius: 10px;
      box-shadow: 0 4px 12px var(--shadow-float);
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
    }
    
    .new-chat-btn:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 6px 18px var(--shadow-float);
    }
    
    /* Main Content Improvements */
    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--bg-main);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    
    .chat-header {
      padding: 16px;
      display: flex;
      align-items: center;
      background: var(--bg-light);
      border-bottom: 1px solid var(--border);
      box-shadow: 0 2px 10px var(--shadow);
      z-index: 10;
    }
    
    .chat-header h2 {
      font-weight: 600;
      flex: 1;
    }
    
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 20px 16px;
      transition: opacity 0.2s ease;
      scroll-behavior: smooth;
      background-image: radial-gradient(var(--shadow) 1px, transparent 1px);
      background-size: 25px 25px;
      background-position: -13px -13px;
    }
    
    .messages-container.fade-out {
      opacity: 0.3;
    }
    
    /* Conversation Title Enhancement */
    .conversation-title {
      text-align: center;
      padding: 16px 0;
      margin: 0 auto 20px;
      max-width: 600px;
      border-radius: 12px;
      background: var(--bg-light);
      box-shadow: 0 3px 10px var(--shadow-card);
    }
    
    .conversation-title h2 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 700;
      background: linear-gradient(to right, var(--primary), var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .conversation-date {
      font-size: 0.8rem;
      color: var(--text-light);
      margin-top: 4px;
    }
    
    /* Welcome Container Styling */
    .welcome-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 600px;
      margin: 24px auto;
      padding: 0 16px;
    }
    
    /* Enhanced Messages */
    .message {
      margin-bottom: 18px;
      border-radius: 16px;
      box-shadow: 0 3px 10px var(--shadow-card);
      transition: all 0.2s ease;
      border: none;
      animation: message-appear 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }
    
    @keyframes message-appear {
      from { opacity: 0; transform: translateY(15px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    
    .message.received {
      background: var(--bg-light);
      align-self: flex-start;
      transform-origin: bottom left;
      border-bottom-left-radius: 4px;
    }
    
    .message.sent {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: var(--text-on-primary);
      align-self: flex-end;
      transform-origin: bottom right;
      border-bottom-right-radius: 4px;
    }
    
    .message:hover {
      box-shadow: 0 6px 16px var(--shadow-hover);
      transform: translateY(-2px);
    }
    
    .message-content {
      padding: 14px 18px;
      position: relative;
    }
    
    .message-content p {
      margin: 0;
      line-height: 1.6;
      font-size: 1rem;
    }
    
    .message-time {
      font-size: 0.75rem;
      color: var(--text-light);
      margin-top: 6px;
      text-align: right;
      opacity: 0.8;
    }
    
    .message.sent .message-time {
      color: rgba(255, 255, 255, 0.8);
    }
    
    .message-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      box-shadow: 0 3px 8px var(--shadow);
      background: linear-gradient(135deg, var(--primary-light), var(--primary));
      color: white;
      margin: 0 12px;
    }
    
    .message.received .message-avatar {
      background: linear-gradient(135deg, var(--accent-light), var(--accent));
    }
    
    .hint-message {
      background: var(--bg-light);
      padding: 16px;
      border-radius: 16px;
      border-left: 4px solid var(--accent);
      display: flex;
      align-items: center;
      box-shadow: 0 4px 15px var(--shadow);
      max-width: 600px;
      margin: 20px auto;
    }
    
    .hint-message i {
      font-size: 1.7rem;
      color: var(--accent);
      margin-right: 12px;
    }
    
    .hint-message p {
      margin: 0;
      line-height: 1.5;
    }
    
    /* Input Area Improvements */
    .composer-container {
      padding: 16px;
      background: var(--bg-light);
      border-top: 1px solid var(--border);
      box-shadow: 0 -2px 10px var(--shadow);
      transition: all 0.3s ease;
      z-index: 5;
    }
    
    .composer {
      background: var(--bg-main);
      border-radius: 18px;
      display: flex;
      align-items: flex-end;
      padding: 10px;
      border: 1px solid var(--border);
      transition: all 0.3s ease;
      box-shadow: 0 2px 12px var(--shadow-card);
    }
    
    .composer:focus-within {
      border-color: var(--primary);
      box-shadow: 0 4px 16px var(--shadow-float);
    }
    
    textarea {
      background: transparent;
      border: none;
      color: var(--text);
      border-radius: 10px;
      transition: all 0.2s ease;
      font-size: 1rem;
      padding: 12px;
    }
    
    textarea:focus {
      outline: none;
    }
    
    textarea::placeholder {
      color: var(--text-light);
      opacity: 0.7;
    }
    
    button {
      border-radius: 12px;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      border: none;
      outline: none;
    }
    
    button:hover {
      transform: translateY(-2px);
    }
    
    button:active {
      transform: translateY(1px);
    }
    
    /* Beautiful Send Button */
    .send-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px 18px;
      height: 40px;
      border-radius: 12px;
      background: var(--bg-dark);
      color: var(--primary);
      cursor: pointer;
      font-weight: 600;
      font-size: 0.95rem;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      box-shadow: 0 3px 6px var(--shadow);
    }
    
    .send-btn span {
      margin-right: 6px;
    }
    
    .send-btn:hover {
      background: var(--primary-light);
      color: white;
      transform: translateY(-3px);
      box-shadow: 0 6px 12px var(--shadow-float);
    }
    
    .send-btn.primary {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white;
    }
    
    .send-btn.primary:hover {
      background: linear-gradient(135deg, var(--primary-light), var(--primary));
      transform: translateY(-3px) scale(1.05);
      box-shadow: 0 8px 16px var(--shadow-float);
    }
    
    /* Theme Toggle Button */
    .theme-toggle {
      position: absolute;
      top: 15px;
      right: 15px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--bg-main);
      border: 1px solid var(--border);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 2px 6px var(--shadow);
      font-size: 1rem;
      z-index: 5;
    }
    
    .theme-toggle:hover {
      background: var(--bg-dark);
      transform: rotate(15deg) scale(1.1);
    }
    
    /* Animations */
    .chat-list.updating {
      opacity: 0.6;
      transform: scale(0.96);
      transition: all 0.3s cubic-bezier(0.68, -0.6, 0.32, 1.6);
    }
    
    /* Active chat indicator for mobile */
    .active-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: var(--accent);
      border-radius: 50%;
      margin-left: 8px;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(247, 37, 133, 0.4); }
      70% { box-shadow: 0 0 0 6px rgba(247, 37, 133, 0); }
      100% { box-shadow: 0 0 0 0 rgba(247, 37, 133, 0); }
    }
    
    /* Typing Indicator Enhancement */
    .typing-indicator {
      display: flex;
      align-items: center;
      padding: 4px 8px;
    }
    
    .typing-indicator span {
      height: 8px;
      width: 8px;
      margin: 0 2px;
      background-color: var(--text-light);
      border-radius: 50%;
      display: inline-block;
      animation: typing 1.4s infinite ease-in-out both;
    }
    
    .typing-indicator span:nth-child(1) { animation-delay: 0s; }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    
    @keyframes typing {
      0%, 100% { transform: scale(1); opacity: 0.7; }
      50% { transform: scale(1.5); opacity: 1; }
    }
    
    /* Copy Button Enhancement */
    .copy-btn-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-top: 4px;
      margin-bottom: 10px;
    }
    
    .copy-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--bg-main);
      border: 1px solid var(--border);
      color: var(--text-light);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.8;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      font-size: 0.9rem;
      box-shadow: 0 2px 6px var(--shadow);
    }
    
    .copy-btn:hover {
      opacity: 1;
      background: var(--primary-light);
      color: white;
      transform: translateY(-3px);
      box-shadow: 0 5px 15px var(--shadow-float);
    }
    
    .copy-btn.copied {
      background: var(--primary);
      color: white;
      opacity: 1;
      transform: scale(1.15);
    }
    
    /* Notifications Enhancement */
    #keyboard-notification {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, var(--primary-dark), var(--primary));
      color: white;
      padding: 10px 20px;
      border-radius: 50px;
      font-size: 0.95rem;
      font-weight: 500;
      z-index: 1000;
      box-shadow: 0 5px 20px var(--shadow-float);
    }
    
    /* Mobile improvements */
    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 85%;
        max-width: 320px;
        transform: translateX(-100%);
        z-index: 1000;
        box-shadow: 5px 0 25px rgba(0,0,0,0.3);
      }
      
      .sidebar.active {
        transform: translateX(0);
      }
      
      .menu-toggle {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: none;
        color: var(--text);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 10px;
        font-size: 1.2rem;
      }
      
      .chat-header {
        padding: 12px;
      }
      
      .conversation-title {
        margin-bottom: 15px;
        padding: 12px 0;
      }
      
      .message {
        margin-bottom: 15px;
        max-width: 95%;
      }
      
      .message-content {
        padding: 12px 15px;
      }
      
      .composer-container {
        padding: 12px;
      }
      
      .theme-toggle {
        top: 10px;
        right: 10px;
        width: 36px;
        height: 36px;
      }
      
      .send-btn {
        padding: 8px 14px;
      }
    }
    
    /* Confetti Animation for Message Generation Success */
    .confetti-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      pointer-events: none;
      z-index: 9999;
    }
    
    .confetti {
      position: absolute;
      width: 10px;
      height: 10px;
      background: #ff0;
      animation: confetti-fall 3s linear forwards;
      top: -10px;
    }
    
    @keyframes confetti-fall {
      0% {
        opacity: 1;
        top: -10px;
        transform: rotateZ(0deg);
      }
      
      100% {
        opacity: 0;
        top: 100vh;
        transform: rotateZ(360deg);
      }
    }
  `;
  document.head.appendChild(enhancedStyles);

  setTimeout(() => {
    showNotification("Tip: Press Enter to send your message", 5000);
  }, 2000);

  messageInput.focus();
});
