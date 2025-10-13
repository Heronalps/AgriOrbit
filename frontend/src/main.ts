// filepath: c:\Repository\ag-advisor-map\ag-advisor-map\frontend\src\main.ts
// Main entry point for the Vue application.
// Initializes Pinia for state management and mounts the root App component.
import { createPinia } from 'pinia'
import './index.css'
import { createApp } from 'vue'
import App from './App.vue'

// Import PrimeVue and required components
import PrimeVue from 'primevue/config'

// Import PrimeVue styles
import 'primevue/resources/themes/lara-light-green/theme.css' // base theme
import 'primeicons/primeicons.css' // icons
import './assets/theme.css' // unified theme for the application

const pinia = createPinia()
const app = createApp(App)

// Register PrimeVue
app.use(PrimeVue, { ripple: true })

// PrimeVue components are now imported directly into the components that use them.

app.use(pinia)

app.mount('#app')
