<template>
    <div class="chat-widget">
        <div class="chat-header">
            <h3>Chat with LLM</h3>
        </div>
        <div class="chat-body">
            <div class="message" v-for="(msg, index) in messages" :key="index"
                :class="{ 'sent': msg.isSent, 'received': !msg.isSent }">
                <div class="message-bubble">{{ msg.text }}</div>
            </div>
        </div>
        <div class="chat-footer">
            <div class="suggestions">
                <button v-for="(suggestion, index) in suggestions" :key="index" @click="sendSuggestion(suggestion)">
                    {{ suggestion }}
                </button>
            </div>
            <div class="chat-input">
                <input v-model="message" @keyup.enter="sendMessage" placeholder="Type your message..." />
                <button @click="sendMessage">Send</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const messages = ref<{ text: string; isSent: boolean }[]>([]);
const message = ref('');
const suggestions = ref([
    "Make recommendations for irrigating my crops",
    "Show me rainfall data",
    "Explain NDVI values"
]);

async function sendMessage() {
    if (!message.value.trim()) return;

    await sendToChat(message.value);
    message.value = ''; // Clear the input after sending
}

async function sendSuggestion(suggestion: string) {
    await sendToChat(suggestion);
}

async function sendToChat(text: string) {
    // Add sent message to chat
    messages.value.push({ text: text, isSent: true });

    // Call your FastAPI backend here
    const response = await fetch('http://127.0.0.1:8157/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text }),
    });

    const data = await response.json();

    // Add received message to chat
    messages.value.push({ text: data.response, isSent: false });
}
</script>

<style scoped>
.chat-widget {
    border: 1px solid #ccc;
    border-radius: 8px;
    width: 300px;
    height: 500px;
    display: flex;
    flex-direction: column;
    background: white;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    position: relative;
}

.chat-header {
    background: #007bff;
    color: white;
    padding: 10px;
    text-align: center;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
}

.chat-body {
    flex: 1;
    padding: 10px;
    overflow-y: auto;
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
    background: #007bff;
    color: white;
    margin-left: auto;
}

.received .message-bubble {
    background: #e5e5ea;
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
    background: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 15px;
    white-space: nowrap;
    cursor: pointer;
}

.suggestions button:hover {
    background: #e0e0e0;
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
    background: #007bff;
    color: white;
    border-radius: 4px;
    cursor: pointer;
}

.chat-input button:hover {
    background: #0056b3;
}
</style>