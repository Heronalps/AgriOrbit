<template>
  <div
    ref="chatWidgetRef"
    class="chat-widget"
    :style="{
      left: position.x + 'px',
      top: position.y + 'px',
      width: dimensions.width + 'px',
      height: dimensions.height + 'px',
    }"
  >
    <div
      class="chat-header"
      @mousedown="startDrag"
    >
      <h2>Agribot</h2>
    </div>
    <div
      class="resize-handle resize-handle-br"
      @mousedown="startResize"
    />

    <!-- Initial State - No Farm Selected -->
    <div
      v-if="!farmDataMode"
      class="farm-setup-container"
    >
      <div class="welcome-message">
        <p>Welcome to AgriBot! To get the most personalized assistance:</p>
        <div class="action-options">
          <button
            class="action-button"
            @click="activateLocationSelection"
          >
            <span class="icon">📍</span>
            Select Farm Location
          </button>
        </div>
        <p class="or-divider">
          —— OR ——
        </p>
        <button
          class="general-chat-button"
          @click="startGeneralChat"
        >
          Continue with General Chat
        </button>
      </div>
    </div>

    <!-- Chat UI -->
    <div
      class="chat-body"
      :class="{ 'limited-mode': !farmDataMode }"
    >
      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="message"
        :class="{ sent: msg.isSent, received: !msg.isSent }"
      >
        <div
          v-if="msg.isSent"
          class="message-bubble"
        >
          {{ msg.text }}
        </div>
        <!-- eslint-disable vue/no-v-html -->
        <div
          v-else
          class="message-bubble"
          v-html="formatMessage(msg.text)"
        />
        <!-- eslint-enable vue/no-v-html -->
      </div>
    </div>

    <div
      v-if="!farmDataMode && messages.length > 3"
      class="token-usage-indicator"
    >
      <div class="token-warning">
        <span class="icon">⚠️</span>
        <span>Using limited context mode. For better insights, select a farm
          location.</span>
      </div>
    </div>

    <div class="chat-footer">
      <div class="suggestions">
        <button
          v-for="(suggestion, index) in currentSuggestions"
          :key="index"
          @click="sendSuggestion(suggestion)"
        >
          {{ suggestion }}
        </button>
      </div>
      <div class="chat-input">
        <input
          v-model="messageInput"
          placeholder="Type your message..."
          :disabled="inputDisabled"
          @keyup.enter="sendMessage"
        >
        <button
          :disabled="inputDisabled"
          @click="sendMessage"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, type Ref } from 'vue';
import { useLocationStore } from '@/stores/locationStore';
import { useProductStore } from '@/stores/productStore';
import { useDraggableResizable } from '@/composables/useDraggableResizable';
import { useChatService, ContextTypeEnum, type Message } from '@/composables/useChatService';

// Store instances
const locationStore = useLocationStore();
const productStore = useProductStore();

// Chat widget DOM element reference
const chatWidgetRef = ref<HTMLElement | null>(null);

// Draggable and Resizable Composable
const { position, dimensions, startDrag, startResize, adjustInitialPosition } = useDraggableResizable(
  chatWidgetRef,
  { x: 10, y: 10 }, // Initial position, will be adjusted by adjustInitialPosition
  { width: 400, height: 600 } // Initial dimensions
);

// Chat Service Composable State
const farmDataMode = ref(false);
const contextType = ref<ContextTypeEnum>(ContextTypeEnum.GENERAL);
const messages = ref<Message[]>([]);
const lastProductId = ref(''); // Track the last product ID to prevent duplicates

// Chat Service Composable
const {
  messageInput, // Renamed from 'message' in the composable
  inputDisabled,
  // messages, // messages is now managed locally and passed to useChatService
  currentSuggestions,
  formatMessage,
  sendMessage,
  sendSuggestion,
  scrollToBottom, // Exposing for direct use if needed
} = useChatService(farmDataMode, contextType, messages, lastProductId);

// Component-specific state
const isLocationSelectionActive = ref(false);

onMounted(() => {
  // Initial position adjustment is handled by useDraggableResizable
  // adjustInitialPosition(); // No longer needed here, called within useDraggableResizable

  const targetLocation = locationStore.targetLocation;
  if (targetLocation) {
    farmDataMode.value = true;
    contextType.value = ContextTypeEnum.FARM_SELECTED;
    messages.value.push({
      text: "I see you've selected a farm location. How can I help you with your farm today?",
      isSent: false,
      model: "AgriBot"
    });
  } else {
    messages.value.push({
      text: "Hello! I'm AgriBot. To get personalized farming advice, please select your farm location on the map.",
      isSent: false,
      model: "AgriBot"
    });
  }

  window.addEventListener('location-selected', handleLocationSelected as EventListener);

  if (productStore.selectedProduct && productStore.selectedProduct.product_id) {
    lastProductId.value = productStore.selectedProduct.product_id;
  }

  // Window resize handling for position is now in useDraggableResizable
  // window.addEventListener('resize', adjustInitialPosition); // No longer needed here
});

onBeforeUnmount(() => {
  window.removeEventListener('location-selected', handleLocationSelected as EventListener);
  // Event listeners for drag/resize are cleaned up by useDraggableResizable
  // window.removeEventListener('resize', adjustInitialPosition); // No longer needed here
});

function activateLocationSelection(): void {
  isLocationSelectionActive.value = true;
  messages.value.push({
    text: 'Please click on the map to select your farm location.',
    isSent: false,
    model: "AgriBot"
  });
  window.dispatchEvent(new CustomEvent('activate-location-selection'));
}

function handleLocationSelected(): void {
  if (isLocationSelectionActive.value) {
    isLocationSelectionActive.value = false;
    // Optionally, add a message confirming location selection was processed
    // messages.value.push({ text: "Location selection mode deactivated.", isSent: false, model: "AgriBot" });
  }
}

function startGeneralChat(): void {
  farmDataMode.value = false;
  contextType.value = ContextTypeEnum.GENERAL;
  messages.value.push({
    text: "I'll be happy to help with general farming questions. Keep in mind that selecting a specific location will allow me to provide more tailored advice.",
    isSent: false,
    model: "AgriBot"
  });
  scrollToBottom(); // Ensure chat scrolls after this interaction
}

// Watch for the clicked point value to be loaded to proactively inform the user
watch(
  () => productStore.clickedPoint,
  (newClickedPoint, oldClickedPoint) => {
    // Check if the value has been newly loaded, is a number, and is meant to be shown
    if (
      newClickedPoint &&
      newClickedPoint.show &&
      typeof newClickedPoint.value === 'number' &&
      // Ensure this triggers when the point data transitions from not-loaded/not-shown to loaded/shown
      // This condition relies on MapView.vue resetting show to false and value to null before loading a new point.
      (oldClickedPoint?.show === false || typeof oldClickedPoint?.value !== 'number') &&
      !isLocationSelectionActive.value // Only trigger if not in the initial farm location selection mode
    ) {
      const locationMessage = `For your selected farm location, the value at your selected point is ${newClickedPoint.value.toFixed(2)}. What would you like to do with this information?`;
      
      messages.value.push({ text: locationMessage, isSent: false, model: 'AgriBot' });
      scrollToBottom(); // Ensure chat scrolls to the new message

      // Ensure context type is updated if needed
      if (contextType.value !== ContextTypeEnum.DATA_LOADED) {
         contextType.value = ContextTypeEnum.DATA_LOADED;
      }
    }
  },
  { deep: true } // Watch deeply as clickedPoint is an object
);

</script>

<style scoped>
/* ... existing styles ... */
.chat-widget {
  border: 1px solid #ccc;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  background: #231f1fc8;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  overflow: hidden; /* Prevent content overflow */
  position: fixed;
  z-index: 1000;
}

.chat-header {
  background: #368535;
  color: white;
  padding: 10px;
  text-align: center;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  position: relative;
  cursor: move; /* Indicate draggable */
  user-select: none; /* Prevent text selection while dragging */
}

.chat-header h2 {
  margin: 0;
  font-size: 1.5em;
  font-weight: 700;
  font-family: 'Montserrat', sans-serif;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.resize-handle {
  position: absolute;
  width: 20px;
  height: 20px;
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
  z-index: 1001;
}

.resize-handle-br:after {
  content: '';
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 12px;
  height: 12px;
  border-right: 2px solid rgba(255, 255, 255, 0.5);
  border-bottom: 2px solid rgba(255, 255, 255, 0.5);
}

.farm-setup-container {
  padding: 20px;
  text-align: center;
  color: white;
}

.welcome-message {
  margin-bottom: 15px;
}

.action-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 20px 0;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: rgba(54, 133, 53, 0.6);
  border: 1px solid #368535;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button:hover {
  background: rgba(54, 133, 53, 0.8);
}

.icon {
  margin-right: 8px;
  font-size: 18px;
}

.or-divider {
  margin: 20px 0;
  opacity: 0.7;
}

.general-chat-button {
  padding: 10px 15px;
  background: rgba(79, 79, 88, 0.6);
  border: 1px solid #4f4f58;
  border-radius: 8px;
  color: white;
  cursor: pointer;
}

.general-chat-button:hover {
  background: rgba(79, 79, 88, 0.8);
}

.chat-body {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
}

.limited-mode {
  position: relative;
}

.limited-mode::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30px;
  background: linear-gradient(to bottom, rgba(255, 193, 7, 0.1), transparent);
  pointer-events: none;
}

.token-usage-indicator {
  padding: 8px;
  background: rgba(255, 193, 7, 0.1);
  border-top: 1px solid rgba(255, 193, 7, 0.3);
}

.token-warning {
  display: flex;
  align-items: center;
  color: #ffc107;
  font-size: 0.85rem;
}

.chat-footer {
  border-top: 1px solid #ccc;
}

.message {
  margin: 5px 0;
}

.message-bubble {
  padding: 10px;
  border-radius: 10px;
  max-width: 80%; /* Increase from 70% to 80% for more space */
  word-wrap: break-word;
  white-space: normal;
  overflow-wrap: break-word;
}

.sent .message-bubble {
  background: #215221;
  color: white;
  margin-left: auto;
}

.received .message-bubble {
  background: #4f4f58;
  color: white;
  max-height: none; /* Remove any height limitation */
  overflow-y: visible; /* Allow content to expand */
}

/* Add styling for markdown elements in bot messages */
.received .message-bubble :deep(p) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  white-space: normal;
}

.received .message-bubble :deep(ul),
.received .message-bubble :deep(ol) {
  padding-left: 1.5em;
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.received .message-bubble :deep(li) {
  margin-bottom: 0.25em;
}

.received .message-bubble :deep(strong),
.received .message-bubble :deep(b) {
  font-weight: bold;
}

.received .message-bubble :deep(em),
.received .message-bubble :deep(i) {
  font-style: italic;
}

.received .message-bubble :deep(code) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Courier New', Courier, monospace;
}

.received .message-bubble :deep(pre) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.5em;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap; /* Ensure pre content wraps */
  word-wrap: break-word;
}

.received .message-bubble :deep(pre code) {
  padding: 0;
  background-color: transparent;
  white-space: pre-wrap; /* Ensure code inside pre wraps */
}

.received .message-bubble :deep(a) {
  color: #8ab4f8; /* A more visible link color on dark background */
  text-decoration: underline;
}

.received .message-bubble :deep(a:hover) {
  color: #aecbfa;
}

.suggestions {
  display: flex;
  flex-wrap: wrap; /* Allow suggestions to wrap */
  padding: 5px;
  gap: 5px; /* Add gap between suggestion buttons */
}

.suggestions button {
  padding: 8px 12px;
  border: 1px solid #4f4f58;
  background: rgba(79, 79, 88, 0.6);
  color: white;
  border-radius: 15px; /* More rounded buttons */
  cursor: pointer;
  font-size: 0.85em;
  transition: background-color 0.2s;
}

.suggestions button:hover {
  background-color: #368535;
}

.chat-input {
  display: flex;
  padding: 10px;
  border-top: 1px solid #4f4f58; /* Match darker theme */
}

.chat-input input {
  flex: 1;
  padding: 10px;
  border: 1px solid #4f4f58;
  border-radius: 5px;
  margin-right: 10px;
  background-color: #333; /* Darker input background */
  color: white;
}

.chat-input input::placeholder {
  color: #aaa; /* Lighter placeholder text */
}

.chat-input button {
  padding: 10px 15px;
  background: #368535;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.chat-input button:disabled {
  background: #555;
  cursor: not-allowed;
}
</style>
