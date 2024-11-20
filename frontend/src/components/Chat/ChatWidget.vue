<template>
    <div class="chat-widget">
        <div class="chat-header">
            <h2>Agribot</h2>
        </div>

        <!-- Initial State - No Farm Selected -->
        <div v-if="!farmDataMode" class="farm-setup-container">
            <div class="welcome-message">
                <p>Welcome to AgriBot! To get the most personalized assistance:</p>
                <div class="action-options">
                    <button @click="promptMapSelection" class="action-button">
                        <span class="icon">📍</span>
                        Select Farm Location
                    </button>
                    <button @click="promptDataUpload" class="action-button">
                        <span class="icon">📊</span>
                        Upload Farm Data
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
                <div class="message-bubble">{{ msg.text }}</div>
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

<script setup lang="ts">
import { ref, inject, onMounted, computed, watch } from 'vue';
import { useLocationStore } from '@/stores/locationStore';
import { useProductStore } from '@/stores/productStore';

const locationStore = useLocationStore();
const productStore = useProductStore();
const messages = ref<{ text: string; isSent: boolean, isLoading?: boolean }[]>([]);
const message = ref('');
const farmDataMode = ref(false);
const inputDisabled = ref(false);
const contextType = ref('general');

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

// Check if farm location is already selected
onMounted(() => {
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
            text: "Hello! I'm AgriBot. To get personalized farming advice, please select your farm location on the map or upload your farm data.",
            isSent: false
        });
    }
});

function promptMapSelection() {
    messages.value.push({
        text: "Please use the 'Set Location' button in the top-right corner of the map to select your farm location.",
        isSent: false
    });
}

function promptDataUpload() {
    messages.value.push({
        text: "To upload farm data, please use the control panel on the right side of the screen.",
        isSent: false
    });
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

async function sendSuggestion(suggestion: string) {
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

// Watch for product changes
watch(() => productStore.selectedProduct, (newProduct) => {
    if (newProduct && Object.keys(newProduct).length > 0) {
        contextType.value = 'data_loaded';
        messages.value.push({
            text: `I see you're viewing ${newProduct.name} data. Would you like me to analyze this for your farm?`,
            isSent: false
        });
    }
}, { deep: true });

async function sendToChat(text: string) {
    // Add sent message to chat
    messages.value.push({ text: text, isSent: true });

    // Create context from your actual store structure
    let context = "";
    
    // Add selected product info if available
    if (productStore.selectedProduct && Object.keys(productStore.selectedProduct).length > 0) {
        context += `(Current product: ${JSON.stringify(productStore.selectedProduct)}) `;
    }
    
    // Add clicked point value if available
    if (productStore.clickedPoint && productStore.clickedPoint.value) {
        context += `(Value at clicked point: ${productStore.clickedPoint.value}) `;
    }
    
    // Get location information if available
    try {
        const targetLocation = locationStore.getTargetLocation();
        if (targetLocation) {
            context += `(User's selected location: ${JSON.stringify(targetLocation)}) `;
        }
    } catch (error) {
        console.log("No target location available");
    }

    // Combine user's query with context
    const contextualizedText = `${text} ${context}`;

    // Call FastAPI backend
    try {
        messages.value.push({ text: "Thinking...", isSent: false, isLoading: true });

        const response = await fetch('http://127.0.0.1:8157/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                text: contextualizedText,
                context_type: contextType.value
            }),
        });
        
        // Remove the loading message
        messages.value = messages.value.filter(msg => !msg.isLoading);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            console.error('Server error:', response.status, errorData);
            
            // Handle specific error cases
            if (response.status === 500 && errorData.detail && errorData.detail.includes('OpenRouter API key is not set')) {
                messages.value.push({ 
                    text: "I'm currently unavailable due to a configuration issue. The server administrator needs to set up the OpenRouter API key.", 
                    isSent: false 
                });
            } else {
                throw new Error(`Server error (${response.status}): ${errorData.detail || 'Unknown error'}`);
            }
            return;
        }

        const data = await response.json();

        // Add received message to chat
        messages.value.push({ text: data.response, isSent: false });
    } catch (error) {
        console.error('Error communicating with the API:', error);
        
        // Remove any loading message that might still be present
        messages.value = messages.value.filter(msg => !msg.isLoading);
        
        messages.value.push({ 
            text: `Sorry, I'm having trouble connecting to the server right now. Error: ${error.message}`, 
            isSent: false 
        });
    }
}
</script>

<style scoped>
.chat-widget {
    border: 1px solid #ccc;
    border-radius: 8px;
    width: 30vw;
    height: 88vh;
    display: flex;
    flex-direction: column;
    background: #231f1fc8;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    position: absolute;
    bottom: 35px;
    left: 10px;
}

.chat-header {
    background: #368535;
    color: white;
    padding: 10px;
    text-align: center;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
}

.chat-header h2 {
    margin: 0;
    font-size: 1.5em;
    font-weight: 700;
    font-family: 'Montserrat', sans-serif;
    text-transform: uppercase;
    letter-spacing: 1px;
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
    max-width: 70%;
    word-wrap: break-word;
}

.sent .message-bubble {
    background: #215221;
    color: white;
    margin-left: auto;
}

.received .message-bubble {
    background: #4f4f58;
    color: white;
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
</style>