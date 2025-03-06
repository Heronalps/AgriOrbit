import { createPinia } from 'pinia'
import './index.css'
import { createApp } from 'vue'
import App from './App.vue'
import { useAvailableDataStore } from '@/stores/availableDataStore';

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);

// Preload product data after Pinia is initialized
const availableDataStore = useAvailableDataStore();
availableDataStore.loadAvailableProducts();

app.mount('#app');
