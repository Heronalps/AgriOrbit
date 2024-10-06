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
        <div class="chat-input">
            <input v-model="message" @keyup.enter="sendMessage" placeholder="Type your message..." />
            <button @click="sendMessage">Send</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const messages = ref<{ text: string; isSent: boolean }[]>([]);
const message = ref('');

async function sendMessage() {
    if (!message.value.trim()) return;

    // Add sent message to chat
    messages.value.push({ text: message.value, isSent: true });

    // Call your FastAPI backend here
    const response = await fetch('http://127.0.0.1:8157/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: message.value }),
    });

    const data = await response.json();

    // Add received message to chat
    messages.value.push({ text: data.response, isSent: false });

    // Clear the input
    message.value = '';
}
</script>

<style scoped>
.chat-widget {
  border: 1px solid #ccc;
  border-radius: 8px;
  width: 300px; /* Adjust width if necessary */
  max-height: 400px; /* Limit height */
  display: flex;
  flex-direction: column;
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  position: relative; /* Ensure it remains contained */
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
  align-self: flex-end;
}

.received .message-bubble {
  background: #e5e5ea;
  align-self: flex-start;
}

.chat-input {
  display: flex;
  padding: 10px;
  border-top: 1px solid #ccc;
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
