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
  const chatHeaderTitle = document.querySelector(".chat-header h2");

  let conversations = [];
  let activeConversationId = null;
  let themeMode = localStorage.getItem("pyintelTheme") || "light";

  // Apply saved theme on load
  document.body.classList.toggle("dark-theme", themeMode === "dark");

  // Theme toggle function
  function toggleTheme() {
    themeMode = themeMode === "light" ? "dark" : "light";
    document.body.classList.toggle("dark-theme", themeMode === "dark");
    localStorage.setItem("pyintelTheme", themeMode);
    updateThemeToggleButton();
  }

  // Function to update theme toggle button icon and title
  function updateThemeToggleButton() {
    const themeToggle = document.querySelector(".theme-toggle");
    if (themeToggle) {
      themeToggle.innerHTML = `<i class="fas fa-${themeMode === "light" ? "moon" : "sun"}"></i>`;
      themeToggle.setAttribute(
        "title",
        `Switch to ${themeMode === "light" ? "dark" : "light"} theme`
      );
    }
  }

  // Add theme toggle button dynamically if needed
  function ensureThemeToggleButton() {
    let themeToggle = document.querySelector(".theme-toggle");
    if (!themeToggle) {
      themeToggle = document.createElement("button");
      themeToggle.className = "theme-toggle";
      const sidebarHeader = document.querySelector(".sidebar-header");
      if (sidebarHeader) {
        const newChatBtnRef = sidebarHeader.querySelector(".new-chat-btn");
        if (newChatBtnRef) {
          sidebarHeader.insertBefore(themeToggle, newChatBtnRef);
        } else {
          sidebarHeader.appendChild(themeToggle);
        }
      } else {
        document.body.appendChild(themeToggle);
        themeToggle.style.position = "fixed";
        themeToggle.style.top = "15px";
        themeToggle.style.right = "15px";
      }
      themeToggle.addEventListener("click", toggleTheme);
    }
    updateThemeToggleButton();
  }
  ensureThemeToggleButton();

  // Auto-resize textareas
  const autoResize = (textarea) => {
    textarea.style.height = "auto";
    const maxHeight = 150;
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px";
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  [messageInput, intentInput].forEach((textarea) => {
    textarea.addEventListener("input", () => autoResize(textarea));
    autoResize(textarea);
  });

  // Add confetti effect for successful generation
  function showConfetti() {
    const confettiContainer = document.createElement("div");
    confettiContainer.className = "confetti-container";
    document.body.appendChild(confettiContainer);

    for (let i = 0; i < 30; i++) {
      const confetti = document.createElement("div");
      confetti.className = "confetti";
      confetti.style.left = Math.random() * 100 + "vw";
      confetti.style.animationDelay = Math.random() * 1.5 + "s";
      confetti.style.animationDuration = Math.random() * 1 + 2 + "s";
      confetti.style.background = `hsl(${Math.random() * 360}, 90%, 60%)`;
      confetti.style.transform = `scale(${Math.random() * 0.5 + 0.5})`;
      confettiContainer.appendChild(confetti);
    }

    setTimeout(() => confettiContainer.remove(), 3000);
  }

  // Add avatar content based on sender
  function getAvatarContent(sender) {
    if (sender === "ai") return '<i class="fas fa-robot"></i>';
    if (sender === "you") return '<i class="fas fa-user"></i>';
    if (sender === "them") return '<i class="fas fa-user-friends"></i>';
    return "?";
  }

  // --- Initialization ---
  loadConversations();
  renderChatList();
  if (conversations.length > 0) {
    conversations.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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
        conversations.forEach((convo) => {
          convo.messages = convo.messages || [];
          convo.createdAt = convo.createdAt || Date.now();
        });
        conversations.sort((a, b) => b.createdAt - a.createdAt);
      } catch (e) {
        console.error("Error parsing stored conversations:", e);
        conversations = [];
      }
    } else {
      conversations = [];
    }
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
      showNotification("Error saving conversation data.", 3000);
    }
  }

  function getConversation(id) {
    return conversations.find((convo) => convo.id === id);
  }

  function addMessageToConversation(sender, content, isIntentOnly = false) {
    const conversation = getConversation(activeConversationId);
    if (!conversation) {
        console.error("Cannot add message: Active conversation not found.");
        return;
    }

    const message = {
      sender,
      content,
      isIntentOnly,
      timestamp: Date.now(),
    };
    conversation.messages.push(message);
    // Update conversation's last updated time (optional but good for sorting)
    conversation.updatedAt = Date.now();
    saveConversations();
    // Update sidebar preview after saving
    renderChatList();
  }

  function confirmDeleteConversation(conversationId) {
    // Use a more modern confirmation dialog if available, or stick with confirm
    const confirmation = confirm(
      "Are you sure you want to delete this conversation? This action cannot be undone."
    );
    if (confirmation) {
      deleteConversation(conversationId);
    }
  }

  function renderChatList() {
    chatList.innerHTML = "";
    if (conversations.length === 0) {
      chatList.innerHTML =
        '<div class="empty-state"><i class="fas fa-comments"></i><p>No conversations yet. Start a new one!</p></div>';
      return;
    }

    conversations.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    conversations.forEach((convo) => {
      const chatItem = document.createElement("div");
      chatItem.className = `chat-item ${
        convo.id === activeConversationId ? "active" : ""
      }`;
      chatItem.dataset.id = convo.id;

      const lastMessage =
        convo.messages.length > 0
          ? convo.messages[convo.messages.length - 1]
          : null;

      let previewText = "No messages yet...";
      if (lastMessage) {
        if (lastMessage.isIntentOnly) {
          previewText = `Intent: ${lastMessage.content}`;
        } else {
          previewText = lastMessage.content;
        }
      }
      const maxPreviewLength = 40;
      previewText =
        previewText.length > maxPreviewLength
          ? previewText.substring(0, maxPreviewLength) + "..."
          : previewText;

      const timeText = lastMessage
        ? formatTimestamp(lastMessage.timestamp)
        : formatTimestamp(convo.createdAt);

      chatItem.innerHTML = `
                <div class="chat-avatar">
                  ${getAvatarContent("ai")}
                </div>
                <div class="chat-info">
                    <div class="chat-name">
                      <span>${convo.name || `Chat ${convo.id.substring(0, 5)}`}</span>
                      <div class="chat-actions">
                        <button class="edit-chat-btn" title="Rename chat"><i class="fas fa-pencil-alt"></i></button>
                        <button class="delete-chat-btn" title="Delete chat"><i class="fas fa-trash-alt"></i></button>
                      </div>
                    </div>
                    <div class="chat-preview">${previewText}</div>
                </div>
                <div class="chat-time">${timeText}</div>
            `;

      chatItem.addEventListener("click", () => switchChat(convo.id));

      chatItem
        .querySelector(".edit-chat-btn")
        .addEventListener("click", (e) => {
          e.stopPropagation();
          renameConversation(convo.id);
        });

      chatItem
        .querySelector(".delete-chat-btn")
        .addEventListener("click", (e) => {
          e.stopPropagation();
          confirmDeleteConversation(convo.id);
        });

      chatList.appendChild(chatItem);
    });
  }

  function renameConversation(conversationId) {
    const conversation = getConversation(conversationId);
    if (!conversation) return;

    const newName = prompt(
      "Enter new name for the conversation:",
      conversation.name || `Chat ${conversation.id.substring(0, 5)}`
    );

    if (newName !== null && newName.trim() !== "") {
      conversation.name = newName.trim();
      saveConversations();
      renderChatList();
      if (conversationId === activeConversationId) {
        updateChatHeader(conversation);
      }
    }
  }

  function deleteConversation(conversationId) {
    const index = conversations.findIndex((convo) => convo.id === conversationId);
    if (index !== -1) {
      conversations.splice(index, 1);
      saveConversations();

      if (activeConversationId === conversationId) {
        if (conversations.length > 0) {
          conversations.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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

  function updateChatHeader(conversation) {
    if (chatHeaderTitle && conversation) {
      chatHeaderTitle.textContent =
        conversation.name || `Chat ${conversation.id.substring(0, 5)}`;
    } else if (chatHeaderTitle) {
      chatHeaderTitle.textContent = "Pyintel Relate";
    }
  }

  function renderMessages(conversationId) {
    messagesContainer.innerHTML = "";
    const conversation = getConversation(conversationId);
    if (!conversation) {
      messagesContainer.innerHTML =
        '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Conversation not found.</p></div>';
      updateChatHeader(null);
      return;
    }

    updateChatHeader(conversation);

    if (conversation.messages.length === 0) {
      messagesContainer.innerHTML += `
                <div class="welcome-container">
                  <div class="message received">
                      <div class="message-avatar">${getAvatarContent("ai")}</div>
                      <div class="message-content">
                          <p>Hello! I'm Pyintel Relate. How can I assist you today?</p>
                          <div class="message-time">${getCurrentTime()}</div>
                      </div>
                  </div>
                  <div class="hint-message">
                      <i class="fas fa-info-circle"></i>
                      <p>Enter the message you received, then describe your desired response.</p>
                  </div>
                </div>`;
    } else {
      let lastDate = null;
      conversation.messages.forEach((msg) => {
        const messageDate = new Date(msg.timestamp).toDateString();
        if (messageDate !== lastDate) {
          addDateDivider(msg.timestamp);
          lastDate = messageDate;
        }
        addMessageToDOM(msg.sender, msg.content, msg.isIntentOnly, msg.timestamp);
      });
    }
    scrollToBottom(true);
  }

  function addDateDivider(timestamp) {
    const date = new Date(timestamp);
    const divider = document.createElement("div");
    divider.className = "date-divider";
    divider.innerHTML = `<span>${date.toLocaleDateString([], {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}</span>`;
    messagesContainer.appendChild(divider);
  }

  function switchChat(conversationId) {
    if (activeConversationId === conversationId) return;

    activeConversationId = conversationId;
    renderChatList();
    renderMessages(conversationId);
    resetInputs();

    messageInput.focus();

    if (window.innerWidth <= 768 && sidebar.classList.contains("active")) {
      sidebar.classList.remove("active");
    }

    console.log(`Switched to chat: ${conversationId}`);
  }

  function createNewChat() {
    const newId = `chat-${Date.now()}`;
    const newConvo = {
      id: newId,
      name: `New Conversation`,
      messages: [],
      createdAt: Date.now(),
    };
    conversations.unshift(newConvo);
    activeConversationId = newId;
    saveConversations();

    renderChatList();
    renderMessages(newId);
    resetInputs();
    messageInput.focus();

    console.log(`Created new chat: ${newId}`);
  }

  function formatTimestamp(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    if (diff < oneDay && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } else if (diff < oneWeek) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  }

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

  newChatBtn.addEventListener("click", createNewChat);

  nextBtn.addEventListener("click", () => {
    console.log("Next button clicked"); // <-- Add log
    if (messageInput.value.trim() === "" || !activeConversationId) {
      console.log("Next button: Message input empty or no active chat."); // <-- Add log
      shakeElement(messageInput.closest(".composer"));
      return;
    }
    const conversation = getConversation(activeConversationId);
    if (!conversation) {
      console.error("Next button: Active conversation not found!"); // <-- Add log
      return;
    }
    console.log("Next button: Proceeding..."); // <-- Add log

    addMessageToConversation("them", messageInput.value);
    addMessageToDOM("them", messageInput.value, false, Date.now());

    messageInputContainer.classList.add("hidden");
    intentInputContainer.classList.remove("hidden");
    nextBtn.classList.add("hidden");
    generateBtn.classList.remove("hidden");
    intentInput.focus();
    autoResize(intentInput);

    scrollToBottom();
  });

  generateBtn.addEventListener("click", async () => {
    console.log("Generate button clicked"); // <-- Add log
    if (intentInput.value.trim() === "" || !activeConversationId) {
      console.log("Generate button: Intent input empty or no active chat."); // <-- Add log
      shakeElement(intentInput.closest(".composer"));
      return;
    }
    const conversation = getConversation(activeConversationId);
    if (!conversation) {
      console.error("Generate button: Active conversation not found!"); // <-- Add log
      return;
    }
    console.log("Generate button: Proceeding..."); // <-- Add log

    const intentText = intentInput.value.trim();
    addMessageToConversation("you", intentText, true);
    addMessageToDOM("you", intentText, true, Date.now());

    const theirMessage = messageInput.value.trim();
    const yourIntent = intentText;

    generateBtn.disabled = true;
    intentInput.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    addThinkingIndicator();

    let reply = "";
    try {
      console.log("Generate button: Calling API..."); // <-- Add log
      const GAS_WEB_APP_URL =
        "https://script.google.com/macros/s/AKfycbwzm0I_7e5N9HQDSUfTjB_ijamcyrwQeIznNzM9EyKf9EGy12mZ6MdfcdlIYZcAlPo3/exec";
      const encodedTheirMessage = encodeURIComponent(theirMessage);
      const encodedYourIntent = encodeURIComponent(yourIntent);
      const urlWithParams = `${GAS_WEB_APP_URL}?theirMessage=${encodedTheirMessage}&yourIntent=${encodedYourIntent}`;
      const requestOptions = { method: "POST", redirect: "follow" };
      const response = await fetch(urlWithParams, requestOptions);
      console.log("Generate button: API response status:", response.status); // <-- Add log
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const responseText = await response.text();
      console.log("Generate button: API response text:", responseText); // <-- Add log
      const data = JSON.parse(responseText);

      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        reply = data.candidates[0].content.parts[0].text;
        console.log("Generate button: Reply generated successfully."); // <-- Add log
      } else {
        reply = "Sorry, I couldn't generate a suitable reply.";
        console.log("Generate button: No valid reply found in API response.", data); // <-- Add log
      }
    } catch (error) {
      console.error("Error generating response:", error);
      reply =
        "Error generating response. Please check the connection or try again.";
      showNotification("Error generating response", 3000);
    }

    generateBtn.disabled = false;
    intentInput.disabled = false;
    generateBtn.innerHTML = '<i class="fas fa-magic"></i>';
    removeThinkingIndicator();

    addMessageToConversation("ai", reply);
    addMessageToDOM("ai", reply, false, Date.now());

    resetInputs();
    renderChatList();
    console.log("Generate button: Process complete."); // <-- Add log
  });

  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

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

  function addMessageToDOM(sender, content, isIntentOnly = false, timestamp) {
    const messageWrapper = document.createElement("div");
    messageWrapper.className = `message ${
      sender === "them" ? "received" : "sent"
    }`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.innerHTML = getAvatarContent(sender);

    const messageContent = document.createElement("div");
    messageContent.className = "message-content";

    const paragraph = document.createElement("p");
    if (isIntentOnly) {
      paragraph.innerHTML = `<span style="opacity: 0.8; font-style: italic;">(My intent: ${content})</span>`;
      messageWrapper.classList.add("intent-message");
    } else {
      paragraph.textContent = content;
    }
    messageContent.appendChild(paragraph);

    const timeDiv = document.createElement("div");
    timeDiv.className = "message-time";
    timeDiv.textContent = timestamp
      ? new Date(timestamp).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : getCurrentTime();
    messageContent.appendChild(timeDiv);

    messageWrapper.appendChild(messageContent);
    messageWrapper.appendChild(avatar);

    if (sender === "ai" && !isIntentOnly) {
      const copyBtnWrapper = document.createElement("div");
      copyBtnWrapper.className = "copy-btn-wrapper";
      const copyButton = document.createElement("button");
      copyButton.className = "copy-btn";
      copyButton.innerHTML = '<i class="fas fa-copy"></i>';
      copyButton.title = "Copy response";
      copyButton.addEventListener("click", () => {
        navigator.clipboard
          .writeText(content)
          .then(() => {
            copyButton.innerHTML = '<i class="fas fa-check"></i>';
            copyButton.classList.add("copied");
            setTimeout(() => {
              copyButton.innerHTML = '<i class="fas fa-copy"></i>';
              copyButton.classList.remove("copied");
            }, 1500);
          })
          .catch((err) => {
            console.error("Failed to copy: ", err);
            showNotification("Failed to copy", 2000);
          });
      });
      copyBtnWrapper.appendChild(copyButton);
      messageWrapper.appendChild(copyBtnWrapper);
    }

    messagesContainer.appendChild(messageWrapper);
  }

  function addThinkingIndicator() {
    if (document.getElementById("thinkingIndicator")) return;

    const indicatorWrapper = document.createElement("div");
    indicatorWrapper.className = "message received";
    indicatorWrapper.id = "thinkingIndicator";

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.innerHTML = getAvatarContent("ai");

    const messageContent = document.createElement("div");
    messageContent.className = "message-content";
    messageContent.innerHTML = `
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        `;

    indicatorWrapper.appendChild(messageContent);
    indicatorWrapper.appendChild(avatar);

    messagesContainer.appendChild(indicatorWrapper);
    scrollToBottom();
  }

  function removeThinkingIndicator() {
    const indicator = document.getElementById("thinkingIndicator");
    if (indicator) {
      indicator.remove();
    }
  }

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
    generateBtn.innerHTML = '<i class="fas fa-magic"></i>';

    messageInput.focus();
    autoResize(messageInput);
    autoResize(intentInput);
  }

  function shakeElement(element) {
    if (element) {
      element.classList.add("shake");
      setTimeout(() => element.classList.remove("shake"), 500);
    }
  }

  function getCurrentTime() {
    return new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function scrollToBottom(instant = false) {
    messagesContainer.scrollTo({
      top: messagesContainer.scrollHeight,
      behavior: instant ? "auto" : "smooth",
    });
  }

  const shakeStyle = document.getElementById("shake-style");
  if (shakeStyle) shakeStyle.remove();

  const notificationStyle = document.getElementById("notification-style");
  if (notificationStyle) notificationStyle.remove();

  const enhancedStyles = document.getElementById("enhanced-styles");
  if (enhancedStyles) enhancedStyles.remove();

  const typingIndicatorStyle = document.getElementById("typing-indicator-style");
  if (typingIndicatorStyle) typingIndicatorStyle.remove();

  setTimeout(() => {}, 2000);

  messageInput.focus();
});
