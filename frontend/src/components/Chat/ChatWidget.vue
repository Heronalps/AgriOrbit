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
  },
  { deep: true },
)
</script>
