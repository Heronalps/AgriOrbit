<template>
    <div 
        class="chat-widget" 
        ref="chatWidget" 
        :style="{
            left: position.x + 'px',
            top: position.y + 'px',
            width: dimensions.width + 'px',
            height: dimensions.height + 'px'
        }">
        <div class="chat-header" @mousedown="startDrag">
            <h2>Agribot</h2>
        </div>
        <div class="resize-handle resize-handle-br" @mousedown="startResize"></div>

        <!-- Initial State - No Farm Selected -->
        <div v-if="!farmDataMode" class="farm-setup-container">
            <div class="welcome-message">
                <p>Welcome to AgriBot! To get the most personalized assistance:</p>
                <div class="action-options">
                    <button @click="activateLocationSelection" class="action-button">
                        <span class="icon">📍</span>
                        Select Farm Location
                    </button>
                </div>
                <p class="or-divider">—— OR ——</p>
                <button @click="startGeneralChat" class="general-chat-button">
                    Continue with General Chat
                </button>
            </div>
        </div>

        <!-- Chat UI -->
        <div class="chat-body" :class="{'limited-mode': !farmDataMode}">
            <div class="message" v-for="(msg, index) in messages" :key="index"
                :class="{ 'sent': msg.isSent, 'received': !msg.isSent }">
                <div class="message-bubble" v-if="msg.isSent">{{ msg.text }}</div>
                <div class="message-bubble" v-else v-html="formatMessage(msg.text)"></div>
            </div>
        </div>

        <div class="token-usage-indicator" v-if="!farmDataMode && messages.length > 3">
            <div class="token-warning">
                <span class="icon">⚠️</span>
                <span>Using limited context mode. For better insights, select a farm location.</span>
            </div>
        </div>

        <div class="chat-footer">
            <div class="suggestions">
                <button v-for="(suggestion, index) in currentSuggestions" :key="index" 
                    @click="sendSuggestion(suggestion)">
                    {{ suggestion }}
                </button>
            </div>
            <div class="chat-input">
                <input v-model="message" @keyup.enter="sendMessage" placeholder="Type your message..." 
                    :disabled="inputDisabled" />
                <button @click="sendMessage" :disabled="inputDisabled">Send</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, inject, onMounted, computed, watch, onBeforeUnmount } from 'vue';
import { useLocationStore } from '@/stores/locationStore';
import { useProductStore } from '@/stores/productStore';
import { marked } from 'marked';

// Store instances
const locationStore = useLocationStore();
const productStore = useProductStore();

// Chat state management
const messages = ref([]);
const message = ref('');
const farmDataMode = ref(false);
const inputDisabled = ref(false);
const contextType = ref('general');
const isLocationSelectionActive = ref(false);
const lastProductId = ref(''); // Track the last product ID to prevent duplicates

// Chat widget position and dimension management
const chatWidget = ref(null);
const position = ref({ x: 10, y: 10 });
const dimensions = ref({ width: 400, height: 600 });
const isDragging = ref(false);
const isResizing = ref(false);
const initialMousePos = ref({ x: 0, y: 0 });
const initialWidgetPos = ref({ x: 0, y: 0 });
const initialWidgetDim = ref({ width: 0, height: 0 });

// Configure marked for safe HTML
marked.setOptions({
  breaks: true,  // Add line breaks
  gfm: true,     // Use GitHub Flavored Markdown
  sanitize: false // Don't sanitize HTML (Vue handles this)
});

// Function to format message text with markdown
function formatMessage(text) {
  if (!text) return '';
  // Process text with marked to convert markdown to HTML
  try {
    return marked(text);
  } catch (error) {
    console.error('Error formatting message:', error);
    return text;
  }
}

// Suggestions based on context
const generalSuggestions = [
    "What are best practices for crop rotation?",
    "Tell me about sustainable farming",
    "How to improve soil health?"
];

const farmSelectedSuggestions = [
    "Analyze soil conditions for this location",
    "Recommend crops for this region",
    "What's the optimal irrigation strategy here?"
];

const dataLoadedSuggestions = [
    "Interpret this NDVI data",
    "How does my farm compare to regional averages?",
    "Identify areas needing attention"
];

const currentSuggestions = computed(() => {
    if (contextType.value === 'data_loaded') return dataLoadedSuggestions;
    if (contextType.value === 'farm_selected') return farmSelectedSuggestions;
    return generalSuggestions;
});

// Dragging functionality
function startDrag(event) {
    event.preventDefault();
    isDragging.value = true;
    initialMousePos.value = { x: event.clientX, y: event.clientY };
    initialWidgetPos.value = { x: position.value.x, y: position.value.y };
    
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
}

function onDrag(event) {
    if (!isDragging.value) return;
    
    const dx = event.clientX - initialMousePos.value.x;
    const dy = event.clientY - initialMousePos.value.y;
    
    position.value.x = initialWidgetPos.value.x + dx;
    position.value.y = initialWidgetPos.value.y + dy;
    
    // Keep widget within viewport
    const minX = 0;
    const minY = 0;
    const maxX = window.innerWidth - dimensions.value.width;
    const maxY = window.innerHeight - dimensions.value.height;
    
    position.value.x = Math.max(minX, Math.min(maxX, position.value.x));
    position.value.y = Math.max(minY, Math.min(maxY, position.value.y));
}

function stopDrag() {
    isDragging.value = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
}

// Resizing functionality
function startResize(event) {
    event.preventDefault();
    isResizing.value = true;
    initialMousePos.value = { x: event.clientX, y: event.clientY };
    initialWidgetDim.value = { width: dimensions.value.width, height: dimensions.value.height };
    
    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', stopResize);
}

function onResize(event) {
    if (!isResizing.value) return;
    
    const dx = event.clientX - initialMousePos.value.x;
    const dy = event.clientY - initialMousePos.value.y;
    
    // Set minimum dimensions
    const minWidth = 300;
    const minHeight = 55; // Title bar height
    
    dimensions.value.width = Math.max(minWidth, initialWidgetDim.value.width + dx);
    dimensions.value.height = Math.max(minHeight, initialWidgetDim.value.height + dy);
}

function stopResize() {
    isResizing.value = false;
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', stopResize);
}

// Check if farm location is already selected
onMounted(() => {
    // Position the chat widget in the bottom-left corner initially
    position.value = { 
        x: 10, 
        y: window.innerHeight - dimensions.value.height - 35 // 35px for bottom margin
    };

    const targetLocation = locationStore.getTargetLocation();
    if (targetLocation) {
        farmDataMode.value = true;
        contextType.value = 'farm_selected';
        messages.value.push({
            text: "I see you've selected a farm location. How can I help you with your farm today?",
            isSent: false
        });
    } else {
        messages.value.push({
            text: "Hello! I'm AgriBot. To get personalized farming advice, please select your farm location on the map.",
            isSent: false
        });
    }

    // Listen for location selection events
    window.addEventListener('location-selected', handleLocationSelected);
    
    // Set initial product ID if there is one
    if (productStore.selectedProduct && productStore.selectedProduct.product_id) {
        lastProductId.value = productStore.selectedProduct.product_id;
    }
    
    // Adjust the initial position based on window size
    adjustInitialPosition();

    // Clean up event listeners
    onBeforeUnmount(() => {
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('mousemove', onResize);
        document.removeEventListener('mouseup', stopResize);
    });
});

// Helper function to ensure the chat widget appears in view
function adjustInitialPosition() {
    const padding = 20;
    const maxX = window.innerWidth - dimensions.value.width - padding;
    const maxY = window.innerHeight - dimensions.value.height - padding;
    
    // Ensure initial position is within bounds
    position.value.x = Math.min(position.value.x, maxX);
    position.value.y = Math.min(position.value.y, maxY);
}

function activateLocationSelection() {
    isLocationSelectionActive.value = true;
    messages.value.push({
        text: "Please click on the map to select your farm location.",
        isSent: false
    });

    // Dispatch event to notify map component that location selection is active
    window.dispatchEvent(new CustomEvent('activate-location-selection'));
}

function handleLocationSelected(event) {
    if (isLocationSelectionActive.value) {
        isLocationSelectionActive.value = false;
    }
}

function startGeneralChat() {
    messages.value.push({
        text: "I'll be happy to help with general farming questions. Keep in mind that selecting a specific location will allow me to provide more tailored advice.",
        isSent: false
    });
}

async function sendMessage() {
    if (!message.value.trim()) return;
    
    inputDisabled.value = true;
    await sendToChat(message.value);
    message.value = '';
    inputDisabled.value = false;
}

async function sendSuggestion(suggestion) {
    inputDisabled.value = true;
    await sendToChat(suggestion);
    inputDisabled.value = false;
}

// Watch for changes in location store
watch(() => locationStore.getTargetLocation(), (newLocation) => {
    if (newLocation && !farmDataMode.value) {
        farmDataMode.value = true;
        contextType.value = 'farm_selected';
        messages.value.push({
            text: `Great! I now have your farm location at latitude ${newLocation.latitude.toFixed(4)} and longitude ${newLocation.longitude.toFixed(4)}. How can I help with your farm?`,
            isSent: false
        });
    }
}, { deep: true });

// Watch for product changes to prevent duplicate messages
watch(() => productStore.selectedProduct, (newProduct) => {
    if (newProduct && Object.keys(newProduct).length > 0 && newProduct.product_id) {
        // Only add message if this is a different product than last time
        if (lastProductId.value !== newProduct.product_id) {
            contextType.value = 'data_loaded';
            const productName = newProduct.display_name || newProduct.product_id || 'selected';
            messages.value.push({
                text: `I see you're viewing ${productName} data. Would you like me to analyze this for your farm?`,
                isSent: false
            });
            
            // Update the last product ID
            lastProductId.value = newProduct.product_id;
        }
    }
}, { deep: true });

async function sendToChat(text) {
    // Add sent message to chat
    messages.value.push({ text: text, isSent: true });

    // Create a more structured context
    let context = "";
    
    // Add selected product info
    if (productStore.selectedProduct && Object.keys(productStore.selectedProduct).length > 0) {
        const product = productStore.selectedProduct;
        const productName = product.display_name || product.product_id || 'selected data';
        
        context += `(Dataset: ${productName}`;
        
        if (product.date) {
            context += `, ${product.date}`;
        }
        
        if (product.meta) {
            const relevantKeys = ['type', 'source', 'crop_type', 'field_size'];
            const metaData = {};
            relevantKeys.forEach(key => {
                if (product.meta[key]) metaData[key] = product.meta[key];
            });
            
            if (Object.keys(metaData).length > 0) {
                context += `, ${JSON.stringify(metaData)}`;
            }
        }
        
        context += ") ";
    }
    
    // Add clicked point value with agricultural context
    if (productStore.clickedPoint && productStore.clickedPoint.value !== null) {
        const value = productStore.clickedPoint.value;
        const x = productStore.clickedPoint.x;
        const y = productStore.clickedPoint.y;
        
        context += `(Field measurement at [${x.toFixed(4)}, ${y.toFixed(4)}]: ${value}. `;
        
        // Provide focused agricultural context for measurement values
        if (productStore.selectedProduct?.product_id) {
            const productId = productStore.selectedProduct.product_id.toLowerCase();
            
            if (productId.includes('ndvi')) {
                context += `NDVI value (plant health indicator): `;
                
                if (value > 0.7) context += `excellent vegetation. `;
                else if (value > 0.5) context += `good vegetation. `;
                else if (value > 0.3) context += `moderate vegetation. `;
                else if (value > 0.1) context += `sparse vegetation. `;
                else context += `very sparse/bare soil. `;
            } 
            else if (productId.includes('ndwi')) {
                context += `NDWI value (water content): ${value > 0.3 ? 'high' : value > 0 ? 'moderate' : 'low'} moisture. `;
            }
            else if (productId.includes('evi')) {
                context += `EVI value (enhanced vegetation): ${value > 0.4 ? 'high biomass' : 'low biomass'}. `;
            }
            else if (productId.includes('temp')) {
                context += `Temperature reading. `;
            }
            else if (productId.includes('moisture') || productId.includes('swi') || productId.includes('soil')) {
                context += `Soil moisture: ${value > 0.6 ? 'high' : value > 0.3 ? 'moderate' : 'low'}. `;
            }
        }
        
        context += ") ";
    }
    
    // Get location information if available
    try {
        const targetLocation = locationStore.getTargetLocation();
        if (targetLocation) {
            const { latitude, longitude } = targetLocation;
            context += `(Farm location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}. `;
            
            // Add season context (important for agriculture)
            const currentDate = new Date();
            const month = currentDate.getMonth() + 1;
            const hemisphere = latitude > 0 ? "Northern" : "Southern";
            
            let season = "";
            if (hemisphere === "Northern") {
                if (month >= 3 && month <= 5) season = "Spring";
                else if (month >= 6 && month <= 8) season = "Summer";
                else if (month >= 9 && month <= 11) season = "Fall";
                else season = "Winter";
            } else {
                if (month >= 3 && month <= 5) season = "Fall";
                else if (month >= 6 && month <= 8) season = "Winter";
                else if (month >= 9 && month <= 11) season = "Spring";
                else season = "Summer";
            }
            
            context += `Current season: ${season}. `;
            context += ") ";
        }
    } catch (error) {
        console.log("No target location available");
    }

    // Combine user's query with context
    const contextualizedText = context ? `${text} ${context}` : text;

    // Call FastAPI backend
    try {
        // Show loading indicator
        const loadingMessage = { text: "Thinking...", isSent: false, isLoading: true };
        messages.value.push(loadingMessage);
        
        // Track when the request started
        const requestStartTime = Date.now();

        // For streaming responses
        if (true) { // Always use streaming for better UX
            // Make fetch request with streaming
            const response = await fetch('http://127.0.0.1:8157/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    text: contextualizedText,
                    context_type: contextType.value,
                    use_streaming: true
                }),
            });
            
            if (!response.ok) {
                // Remove loading message before showing error
                messages.value = messages.value.filter(msg => !msg.isLoading);
                await handleErrorResponse(response);
                return;
            }

            const reader = response.body?.getReader();
            if (!reader) {
                // Remove loading message before showing error
                messages.value = messages.value.filter(msg => !msg.isLoading);
                throw new Error('Response body stream not available');
            }

            const decoder = new TextDecoder();
            let receivedText = '';
            let isDone = false;
            let firstContentReceived = false;

            // Create a response message but only add it once we receive content
            const streamResponseMessage = { 
                text: "", 
                isSent: false,
                model: "Loading..." // Will be updated when complete
            };

            // Process the stream
            while (!isDone) {
                const { value, done } = await reader.read();
                if (done) {
                    isDone = true;
                    continue;
                }

                // Decode the chunk and process it
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        const eventData = line.slice(5).trim(); // Remove 'data: ' prefix
                        
                        if (eventData === '[DONE]') {
                            isDone = true;
                            break;
                        }

                        try {
                            const parsedData = JSON.parse(eventData);
                            if (parsedData.content) {
                                // If this is the first content we're receiving, replace the loading message
                                if (!firstContentReceived) {
                                    firstContentReceived = true;
                                    // Replace loading message with actual response
                                    messages.value = messages.value.filter(msg => !msg.isLoading);
                                    messages.value.push(streamResponseMessage);
                                }
                                
                                // Update the message with new content
                                streamResponseMessage.text += parsedData.content;
                                
                                // Auto-scroll to the bottom of the chat
                                setTimeout(() => {
                                    const chatBody = document.querySelector('.chat-body');
                                    if (chatBody) {
                                        chatBody.scrollTop = chatBody.scrollHeight;
                                    }
                                }, 50);
                            }
                        } catch (e) {
                            console.warn('Failed to parse SSE data:', eventData, e);
                        }
                    }
                }
            }

            // If we never received any content
            if (!firstContentReceived) {
                // Remove loading message
                messages.value = messages.value.filter(msg => !msg.isLoading);
                
                // Add a message indicating no response was received
                messages.value.push({
                    text: "No response received from the model. Please try again.",
                    isSent: false,
                    isError: true
                });
            } else {
                // Add a model name if we got a complete response
                streamResponseMessage.model = "AgriBot";
            }

        } else {
            // For non-streaming responses (fallback)
            const response = await fetch('http://127.0.0.1:8157/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    text: contextualizedText,
                    context_type: contextType.value,
                    use_streaming: false
                }),
            });
            
            // Remove the loading message
            messages.value = messages.value.filter(msg => !msg.isLoading);

            if (!response.ok) {
                await handleErrorResponse(response);
                return;
            }

            const data = await response.json();
            
            messages.value.push({ 
                text: data.response, 
                isSent: false,
                model: data.model
            });
        }
        
        // Auto-scroll to the bottom of the chat
        setTimeout(() => {
            const chatBody = document.querySelector('.chat-body');
            if (chatBody) {
                chatBody.scrollTop = chatBody.scrollHeight;
            }
        }, 100);
    } catch (error) {
        console.error('Error communicating with the API:', error);
        
        // Remove any loading message that might still be present
        messages.value = messages.value.filter(msg => !msg.isLoading);
        
        messages.value.push({ 
            text: "I'm having trouble connecting to the server. Please check your network connection or try again later.", 
            isSent: false,
            isError: true
        });
    }
}

async function handleErrorResponse(response) {
    let errorText = 'Error communicating with the API.';
    try {
        const errorData = await response.json();
        errorText = errorData.detail || errorData.message || 'Server error';
    } catch (e) {
        errorText = `Error ${response.status}: ${response.statusText}`;
    }
    
    messages.value.push({
        text: errorText,
        isSent: false,
        isError: true
    });
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
    max-width: 80%;  /* Increase from 70% to 80% for more space */
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

.chat-input button:disabled, .chat-input input:disabled {
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