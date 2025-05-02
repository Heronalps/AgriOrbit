<template>  <div
    ref="chatWidgetRef"
    class="chat-widget widget-dark-theme"
    :style="{
      left: position.x + 'px',
      top: position.y + 'px',
      width: dimensions.width + 'px',
      height: dimensions.height + 'px',
    }"
  >
    <div class="chat-header" @mousedown="startDrag">
      <h2>Agribot</h2>
    </div>
    <div class="resize-handle resize-handle-br" @mousedown="startResize" />

    <!-- Initial State - No Farm Selected -->
    <div v-if="!farmDataMode" class="farm-setup-container">
      <PCard class="welcome-card">
        <template #title>Welcome to AgriBot!</template>
        <template #content>
          <p>To get the most personalized assistance:</p>
          <div class="action-options">
            <PButton 
              icon="pi pi-map-marker" 
              class="p-button-success" 
              label="Select Farm Location" 
              @click="activateLocationSelection"
            />
          </div>
          <p class="or-divider">—— OR ——</p>
          <PButton 
            icon="pi pi-comments" 
            class="p-button-outlined p-button-secondary" 
            label="Continue with General Chat" 
            @click="startGeneralChat" 
          />
        </template>
      </PCard>
    </div>

    <!-- Chat UI -->
    <div class="chat-body" :class="{ 'limited-mode': !farmDataMode }">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="message"
        :class="{ sent: msg.isSent, received: !msg.isSent }"
      >
        <div v-if="msg.isSent" class="message-bubble">
          {{ msg.text }}
        </div>
        <!-- eslint-disable vue/no-v-html -->
        <div v-else class="message-bubble" v-html="msg.text" />
        <!-- eslint-enable vue/no-v-html -->
      </div>
    </div>

    <div
      v-if="!farmDataMode && messages.length > 3"
      class="token-usage-indicator"
    >
      <div class="token-warning">
        <span class="icon">⚠️</span>
        <span>Using limited context mode. For better insights, select a farm location.</span>
      </div>
    </div>

    <div class="chat-footer">
      <div class="suggestions">
        <PButton
          v-for="(suggestion, index) in currentSuggestions"
          :key="index"
          class="p-button-rounded p-button-outlined p-button-sm"
          @click="sendSuggestion(suggestion)"
        >
          {{ suggestion }}
        </PButton>
      </div>
      <div class="chat-input">
        <span class="p-input-icon-right">
          <i class="pi pi-send" v-if="!inputDisabled" />
          <PInputText
            v-model="messageInput"
            placeholder="Type your message..."
            :disabled="inputDisabled"
            class="w-full"
            @keyup.enter="sendMessage"
          />
        </span>
        <PButton 
          icon="pi pi-send" 
          class="p-button-success" 
          :disabled="inputDisabled" 
          @click="sendMessage"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useLocationStore } from '../../stores/locationStore'
import { useProductStore } from '../../stores/productStore'
import { useDraggableResizable } from '../../composables/useDraggableResizable'
import {
  useChatService,
  ContextTypeEnum,
  type Message,
} from '../../composables/useChatService'
import PCard from 'primevue/card'
import PButton from 'primevue/button'
import PInputText from 'primevue/inputtext'

// Store instances
const locationStore = useLocationStore()
const productStore = useProductStore()

// Chat widget DOM element reference
const chatWidgetRef = ref<HTMLElement | null>(null)

// Draggable and Resizable Composable
const { position, dimensions, startDrag, startResize } = useDraggableResizable(
  chatWidgetRef,
  { x: 10, y: 10 }, // Initial position, will be adjusted by adjustInitialPosition
  { width: 400, height: 600 }, // Initial dimensions
)

// Chat Service Composable State
const farmDataMode = ref(false)
const contextType = ref<ContextTypeEnum>(ContextTypeEnum.GENERAL)
const messages = ref<Message[]>([])
const lastProductId = ref('') // Track the last product ID to prevent duplicates

// Chat Service Composable
const {
  messageInput,
  inputDisabled,
  currentSuggestions,
  sendMessage, // sendMessage in useChatService will now handle formatting for bot messages
  sendSuggestion, // sendSuggestion in useChatService will also handle formatting
  scrollToBottom,
} = useChatService(farmDataMode, contextType, messages, lastProductId)

// Component-specific state
const isLocationSelectionActive = ref(false)

onMounted(() => {
  // Initial position adjustment is handled by useDraggableResizable

  const targetLocation = locationStore.targetLocation
  if (targetLocation) {
    farmDataMode.value = true
    contextType.value = ContextTypeEnum.FARM_SELECTED
    messages.value.push({
      text: "I see you've selected a farm location. How can I help you with your farm today?",
      isSent: false,
      model: 'AgriBot',
    })
  } else {
    messages.value.push({
      text: "Hello! I'm AgriBot. To get personalized farming advice, please select your farm location on the map.",
      isSent: false,
      model: 'AgriBot',
    })
  }

  window.addEventListener(
    'location-selected',
    handleLocationSelected as EventListener,
  )

  if (productStore.selectedProduct && productStore.selectedProduct.product_id) {
    lastProductId.value = productStore.selectedProduct.product_id
  }
})

onBeforeUnmount(() => {
  window.removeEventListener(
    'location-selected',
    handleLocationSelected as EventListener,
  )
})

function activateLocationSelection(): void {
  isLocationSelectionActive.value = true
  messages.value.push({
    text: 'Please click on the map to select your farm location.',
    isSent: false,
    model: 'AgriBot',
  })
  window.dispatchEvent(new CustomEvent('activate-location-selection'))
}

function handleLocationSelected(): void {
  if (isLocationSelectionActive.value) {
    isLocationSelectionActive.value = false
    // Optionally, add a message confirming location selection was processed
    // messages.value.push({ text: "Location selection mode deactivated.", isSent: false, model: "AgriBot" });
  }
}

function startGeneralChat(): void {
  farmDataMode.value = false
  contextType.value = ContextTypeEnum.GENERAL
  messages.value.push({
    text: "I'll be happy to help with general farming questions. Keep in mind that selecting a specific location will allow me to provide more tailored advice.",
    isSent: false,
    model: 'AgriBot',
  })
  scrollToBottom() // Ensure chat scrolls after this interaction
}

// Watch for the clicked point value to be loaded to proactively inform the user
watch(
  () => productStore.clickedPoint,
  (newPoint, oldPoint) => {
    console.log(
      '[ChatWidget] productStore.clickedPoint watcher. New:',
      JSON.parse(JSON.stringify(newPoint)),
      'Old:',
      JSON.parse(JSON.stringify(oldPoint)),
    )

    // Condition: Message should only be shown if the point is marked to be shown,
    // and it's not in location selection mode, and it's no longer loading.
    if (
      newPoint &&
      newPoint.show &&
      !newPoint.isLoading &&
      !isLocationSelectionActive.value
    ) {
      const justFinishedLoadingThisPoint =
        oldPoint?.isLoading === true &&
        newPoint.longitude === oldPoint?.longitude &&
        newPoint.latitude === oldPoint?.latitude

      // isNewPointInteraction helps identify if the click is on a new map location
      const isNewPointInteraction =
        newPoint.longitude !== oldPoint?.longitude ||
        newPoint.latitude !== oldPoint?.latitude ||
        oldPoint === null ||
        oldPoint === undefined // Also treat initial load as new

      if (newPoint.errorMessage) {
        const lastMessageText = messages.value[messages.value.length - 1]?.text
        const potentialNewMessage = `Map data query issue: ${newPoint.errorMessage}`

        // Show error if:
        // 1. We just finished loading this specific point and it resulted in an error.
        // 2. Or, it's an interaction with a new point that immediately has an error.
        // 3. Or, the error message itself has changed for the same point (and not just a re-trigger of the watcher).
        if (
          justFinishedLoadingThisPoint ||
          isNewPointInteraction ||
          (lastMessageText !== potentialNewMessage &&
            !oldPoint?.isLoading &&
            newPoint.longitude === oldPoint?.longitude &&
            newPoint.latitude === oldPoint?.latitude)
        ) {
          // Avoid pushing the exact same error message if it's already the last one.
          if (lastMessageText !== potentialNewMessage) {
            messages.value.push({
              text: potentialNewMessage,
              isSent: false,
              model: 'AgriBot',
            })
            scrollToBottom() // Ensure chat scrolls
          }
        }
        contextType.value = ContextTypeEnum.DATA_LOADED // Consider a specific error context if available
      } else if (typeof newPoint.value === 'number') {
        // Show value if:
        // 1. We just finished loading this specific point and got a value.
        // 2. Or, it's an interaction with a new point that has a value.
        // 3. Or, the value for the same point has changed (e.g. due to product/date change and auto-refresh).
        if (
          justFinishedLoadingThisPoint ||
          isNewPointInteraction ||
          (newPoint.value !== oldPoint?.value &&
            !oldPoint?.isLoading &&
            newPoint.longitude === oldPoint?.longitude &&
            newPoint.latitude === oldPoint?.latitude)
        ) {
          const locationMessage = `For your selected point (Lat: ${newPoint.latitude?.toFixed(4)}, Lon: ${newPoint.longitude?.toFixed(4)}), the value is ${newPoint.value.toFixed(2)}.`
          // Avoid pushing the exact same data message if it's already the last one and for the same point/value.
          const lastMessageText =
            messages.value[messages.value.length - 1]?.text
          if (lastMessageText !== locationMessage) {
            messages.value.push({
              text: locationMessage,
              isSent: false,
              model: 'AgriBot',
            })
            scrollToBottom() // Ensure chat scrolls
          }
          contextType.value = ContextTypeEnum.DATA_LOADED
        }
      }
    }
  },
  { deep: true },
)
</script>

<style scoped>
/* ... existing styles with some modifications */
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
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.welcome-card {
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 8px;
}

:deep(.p-card .p-card-title) {
  color: white;
  font-size: 1.5rem;
}

:deep(.p-card .p-card-content) {
  color: white;
}

.action-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 20px 0;
}

.or-divider {
  margin: 20px 0;
  opacity: 0.7;
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
  max-width: 80%;
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
  max-height: none;
  overflow-y: visible;
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
  flex-wrap: wrap;
  padding: 5px;
  gap: 5px;
}

.chat-input {
  display: flex;
  padding: 10px;
  border-top: 1px solid #4f4f58;
  align-items: center;
  gap: 10px;
}

.chat-input :deep(.p-inputtext) {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.chat-input :deep(.p-inputtext)::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.chat-input :deep(.p-inputtext:focus) {
  box-shadow: 0 0 0 1px #368535;
  border-color: #368535;
}

.chat-input :deep(.p-inputicon-right) {
  width: 100%;
}

.chat-input :deep(.p-button.p-component:disabled) {
  opacity: 0.6;
}
</style>
