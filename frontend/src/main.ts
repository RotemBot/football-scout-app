import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

const app = createApp(App)

// Add Pinia for state management
app.use(createPinia())

app.mount('#app') 