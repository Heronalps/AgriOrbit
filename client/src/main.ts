import { createPinia } from 'pinia'
import 'virtual:windi.css'
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).use(createPinia()).mount('#app')
