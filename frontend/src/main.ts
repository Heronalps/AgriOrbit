import { createPinia } from 'pinia'
import './index.css'
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).use(createPinia()).mount('#app')
