<template>
  <div
    ref="chatWidget"
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
          v-model="message"
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
import { ref, onMounted, computed, watch, onBeforeUnmount, type Ref } from 'vue'
import { useLocationStore, type TargetLocationType } from '@/stores/locationStore'
import { useProductStore, type selectedProductType } from '@/stores/productStore' // Removed unused clickedPointType and ProductListEntry
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Define interfaces for component state
interface Message {
  text: string
  isSent: boolean
  model?: string // Optional: for identifying the sender model (e.g., "AgriBot")
}

interface Position {
  x: number
  y: number
}

interface Dimensions {
  width: number
  height: number
}

// Enum for more robust context type management
enum ContextTypeEnum {
  GENERAL = 'general',
  FARM_SELECTED = 'farm_selected',
  DATA_LOADED = 'data_loaded',
}

// Store instances
const locationStore = useLocationStore()
const productStore = useProductStore()

// Chat state management
const messages: Ref<Message[]> = ref([])
const message: Ref<string> = ref('')
const farmDataMode: Ref<boolean> = ref(false)
const inputDisabled: Ref<boolean> = ref(false)
const contextType: Ref<ContextTypeEnum> = ref(ContextTypeEnum.GENERAL)
const isLocationSelectionActive: Ref<boolean> = ref(false)
const lastProductId: Ref<string> = ref('') // Track the last product ID to prevent duplicates

// Chat widget position and dimension management
const chatWidget: Ref<HTMLElement | null> = ref(null)
const position: Ref<Position> = ref({ x: 10, y: 10 })
const dimensions: Ref<Dimensions> = ref({ width: 400, height: 600 })
const isDragging: Ref<boolean> = ref(false)
const isResizing: Ref<boolean> = ref(false)
const initialMousePos: Ref<Position> = ref({ x: 0, y: 0 })
const initialWidgetPos: Ref<Position> = ref({ x: 0, y: 0 })
const initialWidgetDim: Ref<Dimensions> = ref({ width: 0, height: 0 })

// Configure marked for safe HTML
marked.setOptions({
  breaks: true, // Add line breaks
  gfm: true, // Use GitHub Flavored Markdown
})

/**
 * Formats a message string using marked and DOMPurify.
 * Ensures that the input to marked() is always a string.
 * @param {string | unknown} textInput - The raw message text, which might be a string or an array.
 * @returns {string} The formatted and sanitized HTML string.
 */
function formatMessage(textInput: string | unknown): string {
  let textToProcess: string;

  if (Array.isArray(textInput)) {
    // console.warn('formatMessage received array input, joining to string:', textInput);
    textToProcess = textInput.join(' ');
  } else if (typeof textInput === 'string') {
    textToProcess = textInput;
  } else if (textInput === null || textInput === undefined) {
    // Handle null or undefined gracefully by treating them as empty strings.
    textToProcess = '';
  } else {
    // For other unexpected types, log an error and attempt to convert to string.
    // console.error('formatMessage received unexpected type:', typeof textInput, 'Value:', textInput);
    try {
      textToProcess = String(textInput);
    } catch (e) {
      // console.error('formatMessage: Could not convert input to string:', e);
      // Fallback to an error message if conversion fails.
      return '[Error: Invalid message format]';
    }
  }

  // If, after processing, the string is empty or only whitespace, return an empty string.
  if (!textToProcess.trim()) {
    return '';
  }

  try {
    // At this point, textToProcess is guaranteed to be a string.
    const rawHtml = marked(textToProcess);
    return DOMPurify.sanitize(rawHtml);
  } catch (error) {
    // console.error('Error in formatMessage (marked/DOMPurify):', error, 'Input text was:', textToProcess);
    // Fallback to escaped text if markdown processing fails.
    // This ensures that even if marked/DOMPurify fails, we still render something safe.
    return textToProcess
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Suggestions based on context
const generalSuggestions: string[] = [
  'What are best practices for crop rotation?',
  'Tell me about sustainable farming',
  'How to improve soil health?',
]

const farmSelectedSuggestions: string[] = [
  'Analyze soil conditions for this location',
  'Recommend crops for this region',
  "What's the optimal irrigation strategy here?",
]

const dataLoadedSuggestions: string[] = [
  'Interpret this NDVI data',
  'How does my farm compare to regional averages?',
  'Identify areas needing attention',
]

/**
 * Computed property to get current suggestions based on context type.
 * @returns {string[]} An array of suggestion strings.
 */
const currentSuggestions = computed<string[]>(() => {
  if (contextType.value === ContextTypeEnum.DATA_LOADED) return dataLoadedSuggestions
  if (contextType.value === ContextTypeEnum.FARM_SELECTED) return farmSelectedSuggestions
  return generalSuggestions
})

/**
 * Initiates dragging of the chat widget.
 * @param {MouseEvent} event - The mousedown event.
 */
function startDrag(event: MouseEvent): void {
  event.preventDefault()
  isDragging.value = true
  initialMousePos.value = { x: event.clientX, y: event.clientY }
  if (chatWidget.value) { // Ensure chatWidget is not null
    initialWidgetPos.value = {
      x: position.value.x,
      y: position.value.y,
    }
  }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

/**
 * Handles dragging movement of the chat widget.
 * @param {MouseEvent} event - The mousemove event.
 */
function onDrag(event: MouseEvent): void {
  if (!isDragging.value || !chatWidget.value) return // Ensure chatWidget is not null

  const dx = event.clientX - initialMousePos.value.x
  const dy = event.clientY - initialMousePos.value.y

  position.value.x = initialWidgetPos.value.x + dx
  position.value.y = initialWidgetPos.value.y + dy

  // Keep widget within viewport
  const minX = 0
  const minY = 0
  const maxX = window.innerWidth - dimensions.value.width
  const maxY = window.innerHeight - dimensions.value.height

  position.value.x = Math.max(minX, Math.min(maxX, position.value.x))
  position.value.y = Math.max(minY, Math.min(maxY, position.value.y))
}

/**
 * Stops dragging of the chat widget.
 */
function stopDrag(): void {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

/**
 * Initiates resizing of the chat widget.
 * @param {MouseEvent} event - The mousedown event.
 */
function startResize(event: MouseEvent): void {
  event.preventDefault()
  isResizing.value = true
  initialMousePos.value = { x: event.clientX, y: event.clientY }
  if (chatWidget.value) { // Ensure chatWidget is not null
    initialWidgetDim.value = {
      width: dimensions.value.width,
      height: dimensions.value.height,
    }
  }
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

/**
 * Handles resizing of the chat widget.
 * @param {MouseEvent} event - The mousemove event.
 */
function onResize(event: MouseEvent): void {
  if (!isResizing.value || !chatWidget.value) return // Ensure chatWidget is not null

  const dx = event.clientX - initialMousePos.value.x
  const dy = event.clientY - initialMousePos.value.y

  const minWidth = 300
  const minHeight = 55 // Approximate title bar height, adjust as needed

  dimensions.value.width = Math.max(minWidth, initialWidgetDim.value.width + dx)
  dimensions.value.height = Math.max(
    minHeight,
    initialWidgetDim.value.height + dy
  )
}

/**
 * Stops resizing of the chat widget.
 */
function stopResize(): void {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

/**
 * Adjusts the initial position of the chat widget to ensure it's within view.
 */
function adjustInitialPosition(): void {
  if (!chatWidget.value) return // Ensure chatWidget is not null
  const padding = 20 // Padding from window edges

  // Calculate max positions considering padding
  const maxX = window.innerWidth - dimensions.value.width - padding
  const maxY = window.innerHeight - dimensions.value.height - padding

  // Ensure initial position is within bounds (and not off-screen negatively)
  position.value.x = Math.max(padding, Math.min(position.value.x, maxX))
  position.value.y = Math.max(padding, Math.min(position.value.y, maxY))
}


onMounted(() => {
  // Set initial position (e.g., bottom-left with margin)
  position.value = {
    x: 10, // Default X
    y: window.innerHeight - dimensions.value.height - 35, // Default Y (35px margin from bottom)
  }
  adjustInitialPosition() // Adjust if out of bounds

  const targetLocation = locationStore.targetLocation
  if (targetLocation) {
    farmDataMode.value = true
    contextType.value = ContextTypeEnum.FARM_SELECTED
    messages.value.push({
      text: "I see you've selected a farm location. How can I help you with your farm today?",
      isSent: false,
      model: "AgriBot"
    })
  } else {
    messages.value.push({
      text: "Hello! I'm AgriBot. To get personalized farming advice, please select your farm location on the map.",
      isSent: false,
      model: "AgriBot"
    })
  }

  // Listen for custom event when location is selected on the map
  window.addEventListener('location-selected', handleLocationSelected as EventListener)

  // Set initial product ID if available
  if (productStore.selectedProduct && productStore.selectedProduct.product_id) {
    lastProductId.value = productStore.selectedProduct.product_id
  }

  // Adjust widget position on window resize
  window.addEventListener('resize', adjustInitialPosition)
})

onBeforeUnmount(() => {
  // Clean up global event listeners
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  window.removeEventListener('location-selected', handleLocationSelected as EventListener)
  window.removeEventListener('resize', adjustInitialPosition)
})

/**
 * Activates the location selection mode in the chat.
 */
function activateLocationSelection(): void {
  isLocationSelectionActive.value = true
  messages.value.push({
    text: 'Please click on the map to select your farm location.',
    isSent: false,
    model: "AgriBot"
  })
  // Dispatch a custom event to notify other components (e.g., MapView)
  window.dispatchEvent(new CustomEvent('activate-location-selection'))
}

/**
 * Handles the 'location-selected' event.
 * This function is called when a location is picked on the map.
 */
function handleLocationSelected(): void { // Removed unused event parameter
  if (isLocationSelectionActive.value) {
    isLocationSelectionActive.value = false
    // Optionally, add a message confirming location selection was processed
    // messages.value.push({ text: "Location selection mode deactivated.", isSent: false, model: "AgriBot" });
  }
}

/**
 * Starts a general chat session (no specific farm location).
 */
function startGeneralChat(): void {
  farmDataMode.value = false; // Explicitly set farmDataMode to false
  contextType.value = ContextTypeEnum.GENERAL;
  messages.value.push({
    text: "I'll be happy to help with general farming questions. Keep in mind that selecting a specific location will allow me to provide more tailored advice.",
    isSent: false,
    model: "AgriBot"
  })
}

/**
 * Sends the user's typed message to the chat.
 */
async function sendMessage(): Promise<void> {
  const currentMessageText = message.value.trim()
  if (!currentMessageText) return

  inputDisabled.value = true
  await sendToChat(currentMessageText)
  message.value = '' // Clear input field
  inputDisabled.value = false
}

/**
 * Sends a predefined suggestion message to the chat.
 * @param {string} suggestion - The suggestion text to send.
 */
async function sendSuggestion(suggestion: string): Promise<void> {
  if (!suggestion) return
  inputDisabled.value = true
  await sendToChat(suggestion)
  inputDisabled.value = false
}

// Watch for changes in the targetLocation from the locationStore
watch(
  () => locationStore.targetLocation,
  (newLocation: TargetLocationType | null) => { // Ensure newLocation can be null
    if (newLocation) {
      if (!farmDataMode.value) { // Only update if not already in farm mode to avoid duplicate messages
        farmDataMode.value = true
        contextType.value = ContextTypeEnum.FARM_SELECTED
        messages.value.push({
          text: `Great! I now have your farm location at latitude ${newLocation.latitude.toFixed(
            4
          )} and longitude ${newLocation.longitude.toFixed(
            4
          )}. How can I help with your farm?`,
          isSent: false,
          model: "AgriBot"
        })
      }
    } else {
      // Handle location being cleared
      if (farmDataMode.value) { // Only update if was in farm mode
        farmDataMode.value = false;
        contextType.value = ContextTypeEnum.GENERAL;
        messages.value.push({
          text: "Your farm location has been cleared. We're back to general chat.",
          isSent: false,
          model: "AgriBot"
        });
      }
    }
  },
  { deep: true } // Use deep watch if newLocation is a complex object and mutations need to be tracked
)

// Watch for changes in the selectedProduct from the productStore
watch(
  () => productStore.selectedProduct,
  (newProduct: selectedProductType | null) => { // Ensure newProduct can be null
    if (
      newProduct &&
      Object.keys(newProduct).length > 0 &&
      newProduct.product_id
    ) {
      // Only add message if this is a different product than last time
      if (lastProductId.value !== newProduct.product_id) {
        contextType.value = ContextTypeEnum.DATA_LOADED
        const productName =
          newProduct.display_name || newProduct.product_id || 'selected'
        messages.value.push({
          text: `I see you're viewing ${productName} data. Would you like me to analyze this for your farm?`,
          isSent: false,
          model: "AgriBot"
        })
        lastProductId.value = newProduct.product_id // Update the last product ID
      }
    }
  },
  { deep: true } // Use deep watch for complex product objects
)


/**
 * Scrolls the chat body to the bottom to show the latest messages.
 */
function scrollToBottom(): void {
  // Use nextTick to ensure DOM has updated before scrolling
  import('vue').then(vue => {
    vue.nextTick(() => {
      const chatBody = document.querySelector('.chat-body')
      if (chatBody) {
        chatBody.scrollTop = chatBody.scrollHeight
      }
    });
  });
}

/**
 * Handles error responses from the chat API.
 * @param {Response} response - The fetch Response object.
 */
async function handleErrorResponse(response: Response): Promise<void> {
  let errorText = `Error: ${response.status} ${response.statusText}`
  try {
    const errorData = await response.json()
    // Attempt to get a more specific error message from the response body
    errorText = errorData.detail || errorData.message || errorText
  } catch (e) {
    // If parsing error JSON fails, use the initial errorText
    console.warn('Could not parse error response JSON:', e)
  }
  messages.value.push({ text: errorText, isSent: false, model: "System" })
}

/**
 * Sends a message text to the chat API and handles the streamed response.
 * @param {string} text - The message text to send.
 */
async function sendToChat(text: string): Promise<void> {
  messages.value.push({ text: text, isSent: true })
  scrollToBottom()

  let context = '' // Initialize context string

  // Add selected product information to the context
  if (
    productStore.selectedProduct &&
    Object.keys(productStore.selectedProduct).length > 0 &&
    productStore.selectedProduct.product_id // Ensure product_id exists
  ) {
    const product = productStore.selectedProduct
    const productName = product.display_name || product.product_id || 'selected data'
    context += `(Dataset: ${productName}`
    if (product.date) {
      context += `, Date: ${product.date}`
    }
    // Add metadata if available
    if (product.meta) {
      const relevantMetaKeys: (keyof typeof product.meta)[] = ['type', 'source', 'crop_type', 'field_size']
      const metaInfoParts: string[] = []
      relevantMetaKeys.forEach((key) => {
        if (product.meta && product.meta[key]) {
          metaInfoParts.push(`${String(key)}: ${String(product.meta[key])}`)
        }
      })
      if (metaInfoParts.length > 0) {
        context += `, Meta: { ${metaInfoParts.join(', ')} }`
      }
    }
    context += ') '
  }

  // Add clicked point value with agricultural context
  // Ensure clickedPoint and its properties are valid before using
  if (productStore.clickedPoint &&
      typeof productStore.clickedPoint.value === 'number' &&
      typeof productStore.clickedPoint.x === 'number' &&
      typeof productStore.clickedPoint.y === 'number') {
    const point = productStore.clickedPoint as { value: number; x: number; y: number } // Safe assertion after checks

    context += `(Field measurement at pixel [${point.x.toFixed(0)}, ${point.y.toFixed(0)}]: Value ${point.value.toFixed(2)}. ` // Using toFixed(0) for pixel coordinates

    if (productStore.selectedProduct?.product_id) {
      const productId = productStore.selectedProduct.product_id.toLowerCase()
      // Provide agricultural context based on product ID and value
      if (productId.includes('ndvi')) {
        context += `NDVI (Normalized Difference Vegetation Index - plant health): `
        if (point.value > 0.7) context += `Excellent vegetation. `
        else if (point.value > 0.5) context += `Good vegetation. `
        else if (point.value > 0.3) context += `Moderate vegetation. `
        else if (point.value > 0.1) context += `Sparse vegetation. `
        else context += `Very sparse vegetation or bare soil. `
      } else if (productId.includes('ndwi')) {
        context += `NDWI (Normalized Difference Water Index - water content): ${point.value > 0.3 ? 'High' : point.value > 0 ? 'Moderate' : 'Low'} moisture. `
      } else if (productId.includes('evi')) {
        context += `EVI (Enhanced Vegetation Index - biomass): ${point.value > 0.4 ? 'High biomass' : 'Low biomass'}. `
      } else if (productId.includes('temp')) {
        context += `Temperature reading. ` // Consider adding units if known
      } else if (productId.includes('moisture') || productId.includes('swi') || productId.includes('soil')) {
        context += `Soil Moisture Index: ${point.value > 0.6 ? 'High' : point.value > 0.3 ? 'Moderate' : 'Low'}. `
      }
    }
    context += ') '
  }

  // Add farm location and season information to the context
  if (locationStore.targetLocation) {
    const { latitude, longitude } = locationStore.targetLocation
    context += `(Farm location: Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}. `
    const currentDate = new Date()
    const month = currentDate.getMonth() // 0-indexed (0 for January)
    const hemisphere = latitude > 0 ? 'Northern' : 'Southern'
    let season = ''
    // Determine season based on hemisphere and month
    if (hemisphere === 'Northern') {
      if (month >= 2 && month <= 4) season = 'Spring' // Mar-May
      else if (month >= 5 && month <= 7) season = 'Summer' // Jun-Aug
      else if (month >= 8 && month <= 10) season = 'Autumn' // Sep-Nov
      else season = 'Winter' // Dec-Feb
    } else { // Southern Hemisphere
      if (month >= 2 && month <= 4) season = 'Autumn' // Mar-May
      else if (month >= 5 && month <= 7) season = 'Winter' // Jun-Aug
      else if (month >= 8 && month <= 10) season = 'Spring' // Sep-Nov
      else season = 'Summer' // Dec-Feb
    }
    context += `Current season: ${season}. `
    context += ')'
  }

  const contextualizedText = context ? `${text} ${context}`.trim() : text
  const loadingMessage: Message = { text: 'AgriBot is thinking...', isSent: false, model: "AgriBot" }
  messages.value.push(loadingMessage)
  scrollToBottom()

  try {
    const response = await fetch('http://127.0.0.1:8157/chat', { // Ensure this URL is correct for your backend
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any other headers like Authorization if needed
      },
      body: JSON.stringify({
        text: contextualizedText, // Changed 'message' to 'text'
        context_type: contextType.value, // Uncommented and sending context_type
        // Consider sending the full context object if the backend can process it:
        // context: {
        //   type: contextType.value,
        //   location: locationStore.targetLocation,
        //   product: productStore.selectedProduct,
        //   clickedPoint: productStore.clickedPoint
        // }
      }),
    })

    // Remove loading message
    const loadingMsgIndex = messages.value.findIndex(m => m === loadingMessage);
    if (loadingMsgIndex > -1) {
      messages.value.splice(loadingMsgIndex, 1);
    }

    if (!response.ok) {
      await handleErrorResponse(response)
      return
    }

    if (!response.body) {
      messages.value.push({ text: "Received an empty response from the server.", isSent: false, model: "System" });
      return;
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let streamDone = false
    let currentStreamedText = ''

    // Add a new message object for the streamed response
    const streamResponseMessage: Message = { text: '', isSent: false, model: 'AgriBot' } // Default model
    messages.value.push(streamResponseMessage)

    while (!streamDone) {
      const { value, done } = await reader.read()
      streamDone = done
      if (value) {
        const chunk = decoder.decode(value, { stream: !done }) // stream: true until the last chunk
        // Process server-sent events if applicable, or just append chunk
        // This example assumes the backend sends data chunks that might be JSON or plain text.
        // Adjust parsing based on your backend's streaming format.
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const eventData = line.substring(5).trim();
            if (eventData === '[DONE]') { // Check for a custom end-of-stream marker
              streamDone = true;
              break;
            }
            try {
              const parsedData = JSON.parse(eventData);
              if (parsedData.choices && parsedData.choices[0].delta?.content) {
                currentStreamedText += parsedData.choices[0].delta.content;
              } else if (typeof parsedData.content === 'string') { // Handle other possible structures
                 currentStreamedText += parsedData.content;
              }
              // Update model if provided in the stream
              if (parsedData.model) {
                streamResponseMessage.model = parsedData.model;
              }
            } catch (e) {
              // If JSON.parse fails, and it's not a control message, append raw line (if meaningful)
              // This part depends heavily on the expected stream format.
              // For simple text streams, you might just append the line.
              // console.warn('Non-JSON data in stream or malformed JSON:', eventData);
               if(eventData && eventData !== '[DONE]') currentStreamedText += eventData + '\n'; // Append non-JSON as is, with newline
            }
          } else if (line.trim()) {
             // Handle lines that don't start with "data: " if necessary
             // currentStreamedText += line + '\n'; // Example: append plain text lines
          }
        }
        streamResponseMessage.text = formatMessage(currentStreamedText); // Format incrementally
        scrollToBottom();

      }
    }
    // Final formatting pass if needed, though incremental formatting is preferred
    streamResponseMessage.text = formatMessage(currentStreamedText);
    scrollToBottom();

  } catch (error) { // Catch type is unknown for better safety over any
    console.error('Chat API request failed:', error)
    // Ensure loading message is removed if an error occurs early
    const loadingMsgIndex = messages.value.findIndex(m => m.text === 'AgriBot is thinking...');
    if (loadingMsgIndex > -1) {
      messages.value.splice(loadingMsgIndex, 1);
    }
    messages.value.push({
      text: `Sorry, I encountered an error: ${(error as Error).message || 'Unknown chat connection error'}.`,
      isSent: false,
      model: "System"
    })
  } finally {
    inputDisabled.value = false
    scrollToBottom() // Ensure scroll after any operation
  }
}
</script>

<style scoped>
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

.received .message-bubble :deep(h1),
.received .message-bubble :deep(h2),
.received .message-bubble :deep(h3),
.received .message-bubble :deep(h4) {
  margin-top: 0.75em;
  margin-bottom: 0.5em;
  font-weight: bold;
}

.received .message-bubble :deep(code) {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-family: monospace;
  white-space: pre-wrap;
}

.received .message-bubble :deep(pre) {
  background-color: rgba(0, 0, 0, 0.3);
  padding: 0.5em;
  border-radius: 4px;
  overflow-x: auto;
  margin: 0.5em 0;
  white-space: pre-wrap;
}

.received .message-bubble :deep(a) {
  color: #8cc63f;
  text-decoration: underline;
}

.received .message-bubble :deep(strong) {
  font-weight: bold;
}

.received .message-bubble :deep(em) {
  font-style: italic;
}

.suggestions {
  display: flex;
  overflow-x: auto;
  padding: 10px;
  border-bottom: 1px solid #ccc;
}

.suggestions button {
  flex: 0 0 auto;
  margin-right: 10px;
  padding: 5px 10px;
  background: #4fbd4d6e;
  color: white;
  border: 1px solid #ccc;
  border-radius: 15px;
  white-space: nowrap;
  cursor: pointer;
}

.suggestions button:hover {
  background: #4fbd4dcd;
}

.chat-input {
  display: flex;
  padding: 10px;
}

.chat-input input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.chat-input button {
  padding: 10px;
  margin-left: 10px;
  border: none;
  background: #368535;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

.chat-input button:hover {
  background: #215221;
}

.chat-input button:disabled,
.chat-input input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .chat-widget {
    width: 90vw;
  }
}
</style>
