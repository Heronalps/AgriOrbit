// filepath: c:\Repository\ag-advisor-map\ag-advisor-map\frontend\src\main.ts
// Main entry point for the Vue application.
// Initializes Pinia for state management and mounts the root App component.
import { createPinia } from 'pinia'
import './index.css'
import { createApp } from 'vue'
import App from './App.vue'

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);

app.mount('#app');
