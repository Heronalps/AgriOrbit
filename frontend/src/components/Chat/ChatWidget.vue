<template>
  <PPanel
    ref="chatWidgetRef"
    header="AgriBot Chat"
    class="chat-widget widget-dark-theme"
    :style="panelStyle"
    :pt="panelPt"
    :toggleable="false"
  >
    <ScrollPanel
      ref="scrollPanelComponentRef"
      class="chat-body-scroll-panel"
      :pt="{
        wrapper: {
          style:
            'height: 100%; display: flex; flex-direction: column; min-height: 0; overflow: hidden; border-bottom: 1px solid var(--surface-border);',
        },
        content: {
          style:
            'flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 1rem;',
        },
      }"
    >
      <div class="chat-body">
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
    </ScrollPanel>

    <div
      v-if="!farmDataMode && messages.length > 0 && initialInteractionMade"
      class="token-usage-indicator"
    >
      <div class="token-warning">
        <span class="icon">⚠️</span>
        <span
          >Using limited context mode. For better insights, select a farm
          location.</span
        >
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
        <span class="p-input-icon-right w-full">
          <PInputText
            v-model="messageInput"
            placeholder="Type your message..."
            :disabled="inputDisabled"
            class="w-full custom-grey-input-text"
            @keyup.enter="sendMessage"
          />
        </span>
        <PButton
          icon="pi pi-send"
          class="p-button-primary"
          :disabled="inputDisabled || !messageInput"
          @click="sendMessage"
        />
      </div>
    </div>
  </PPanel>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useLocationStore } from '../../stores/locationStore'
import { useProductStore } from '../../stores/productStore'
import { useDraggable } from '../../composables/useDraggable'
import {
  useChatService,
  ContextTypeEnum,
  type Message,
} from '../../composables/useChatService'
import PButton from 'primevue/button'
import PInputText from 'primevue/inputtext'
import PPanel from 'primevue/panel'
import ScrollPanel from 'primevue/scrollpanel'

// Store instances
const locationStore = useLocationStore()
const productStore = useProductStore()

// Chat widget DOM element reference
const chatWidgetRef = ref<HTMLElement | null>(null)

// Ref for the ScrollPanel component instance
const scrollPanelComponentRef = ref<InstanceType<typeof ScrollPanel> | null>(
  null,
)

// Draggable and Resizable Composable
const initialWidth = 400
const initialHeight = 600
const { position, dimensions, startDrag } = useDraggable(
  chatWidgetRef,
  { x: 10, y: window.innerHeight - initialHeight - 10 }, // Positioned to the bottom-left
  { width: initialWidth, height: initialHeight },
)

const panelPt = computed(() => ({
  header: {
    onmousedown: startDrag,
    style: 'cursor: move; width: 100%; user-select: none; flex-shrink: 0;',
  },
  toggleablecontent: {
    // Wrapper for the main content slot
    style:
      'flex: 1 1 auto; min-height: 0; overflow: hidden; display: flex; flex-direction: column;',
  },
  content: {
    // The .p-panel-content div itself
    style:
      'display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; overflow: hidden; padding: 0; height: 100%;',
  },
}))

// Computed style for PPanel positioning and dimensions
const panelStyle = computed(() => ({
  left: position.value.x + 'px',
  top: position.value.y + 'px',
  width: dimensions.value.width + 'px',
  height: dimensions.value.height + 'px',
  position: 'fixed',
  zIndex: 1050, // Ensure it's not under the ActionToolbar
  display: 'flex', // Make PPanel a flex container
  flexDirection: 'column', // Arrange PPanel sections (header, content) vertically
  overflow: 'hidden', // Prevent PPanel itself from growing beyond its dimensions
}))

// Chat Service Composable State
const farmDataMode = ref(false)
const contextType = ref<ContextTypeEnum>(ContextTypeEnum.GENERAL)
const messages = ref<Message[]>([])
const lastProductId = ref('')
const initialInteractionMade = ref(false)

// Chat Service Composable
const {
  messageInput,
  inputDisabled,
  currentSuggestions,
  sendMessage,
  sendSuggestion,
  scrollToBottom, // Keep scrollToBottom available for direct calls if needed elsewhere
} = useChatService(
  farmDataMode,
  contextType,
  messages,
  lastProductId,
  scrollPanelComponentRef,
)

// Watch for changes in messages and scroll to bottom after DOM updates
watch(
  messages,
  () => {
    scrollToBottom()
  },
  { deep: true, flush: 'post' },
)

onMounted(() => {
  const targetLocation = locationStore.targetLocation
  if (targetLocation) {
    farmDataMode.value = true
    contextType.value = ContextTypeEnum.FARM_SELECTED
    messages.value.push({
      text: "I see you've selected a farm location. How can I help you with your farm today?",
      isSent: false,
      model: 'AgriBot',
    })
    initialInteractionMade.value = true
  } else {
    messages.value.push({
      text: "Hello! I'm AgriBot. Please use the toolbar to select a farm or start a general chat.",
      isSent: false,
      model: 'AgriBot',
    })
  }

  window.addEventListener(
    'location-selected',
    handleLocationSelectedEvent as EventListener, // Renamed for clarity
  )
  window.addEventListener(
    'start-general-chat',
    handleStartGeneralChatEvent as EventListener,
  )

  if (productStore.selectedProduct && productStore.selectedProduct.product_id) {
    lastProductId.value = productStore.selectedProduct.product_id
  }
  scrollToBottom() // Initial scroll
})

onBeforeUnmount(() => {
  window.removeEventListener(
    'location-selected',
    handleLocationSelectedEvent as EventListener,
  )
  window.removeEventListener(
    'start-general-chat',
    handleStartGeneralChatEvent as EventListener,
  )
})

function handleLocationSelectedEvent(): void {
  // Renamed for clarity
  farmDataMode.value = true
  contextType.value = ContextTypeEnum.FARM_SELECTED
  initialInteractionMade.value = true
  messages.value.push({
    text: 'Farm location selected! How can I assist you with this area?',
    isSent: false,
    model: 'AgriBot',
  })
  scrollToBottom()
}

function handleStartGeneralChatEvent() {
  // Renamed for clarity
  farmDataMode.value = false
  contextType.value = ContextTypeEnum.GENERAL
  initialInteractionMade.value = true
  messages.value.push({
    text: "I'll be happy to help with general farming questions. Keep in mind that selecting a specific location will allow me to provide more tailored advice.",
    isSent: false,
    model: 'AgriBot',
  })
  scrollToBottom()
}

watch(
  () => productStore.clickedPoint,
  () => {
    /* Placeholder for future logic if needed */
  },
  { deep: true },
)
</script>

<style scoped>
.chat-body-scroll-panel {
  flex: 1 1 auto;
  min-height: 0;
}

.chat-body {
  height: auto;
}

.token-usage-indicator {
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  background-color: var(--widget-background);
  border-top: 1px solid var(--surface-border);
  color: var(--text-color-secondary);
}
.token-warning {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
}
.token-warning .icon {
  margin-right: 0.5rem;
}

.chat-footer {
  flex-shrink: 0;
  padding: 0.75rem 1rem; /* Increased top/bottom padding for more overall space */
  background-color: var(--widget-background);
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem; /* Adds space between buttons if they wrap */
  margin-bottom: 0.75rem; /* Adds space between suggestions and chat input */
}

/* Style for individual suggestion buttons */
.suggestions > .p-button.p-button-sm {
  padding-top: 0.2rem !important; /* Reduced vertical padding */
  padding-bottom: 0.2rem !important; /* Reduced vertical padding */
  height: auto !important; /* Allow height to conform to content */
  line-height: 1.3 !important; /* Adjust line height for potentially wrapped/justified text */
  text-align: left !important; /* Ensure button's own text-align doesn't interfere */
}

/* Style for the text label inside suggestion buttons */
.suggestions > .p-button.p-button-sm .p-button-label {
  text-align: justify;
  display: block; /* Necessary for text-align: justify to work effectively on multiple lines */
  width: 100%; /* Ensures the block takes the full width of the button's text area */
  white-space: normal !important; /* Allows text to wrap */
  overflow-wrap: break-word; /* Helps break long words to prevent overflow */
  hyphens: auto; /* Optional: can improve justification appearance */
}

.chat-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-top: none !important; /* Explicitly remove any top border */
}

.message {
  display: flex;
  margin-bottom: 0.75rem;
}

.message-bubble {
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius-lg);
  max-width: 85%;
  word-wrap: break-word;
}

.sent {
  justify-content: flex-end;
}
.sent .message-bubble {
  background-color: var(--primary-color);
  color: var(--primary-color-text);
}

.received {
  justify-content: flex-start;
}
.received .message-bubble {
  background-color: var(--surface-c);
  color: var(--text-color);
}
</style>
