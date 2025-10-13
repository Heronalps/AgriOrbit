import { ref, computed, watch, type Ref, nextTick } from 'vue'
import { useMessageFormatter } from './useMessageFormatter'
import { useChatContext } from './useChatContext'
import { useChatStreamHandler } from './useChatStreamHandler'
import {
  useLocationStore,
  type TargetLocationType,
} from '@/stores/locationStore'
import { useProductStore } from '@/stores/productStore'
import type { selectedProductType } from '@/stores/productStore'
import type ScrollPanel from 'primevue/scrollpanel'

// Define interfaces for component state
export interface Message {
  text: string
  isSent: boolean
  model?: string // Optional: for identifying the sender model (e.g., "AgriBot")
}

// Enum for context type management
export enum ContextTypeEnum {
  GENERAL = 'general',
  FARM_SELECTED = 'farm_selected',
  DATA_LOADED = 'data_loaded',
}

/**
 * Composable for managing chat service functionalities.
 * @param farmDataMode - Ref to indicate if farm data mode is active.
 * @param contextType - Ref to indicate the current chat context type.
 * @param messages - Ref to the array of chat messages.
 * @param lastProductId - Ref to store the ID of the last selected product.
 * @param scrollPanelRef - Optional ref to the ScrollPanel component instance for scrolling.
 */
export function useChatService(
  farmDataMode: Ref<boolean>,
  contextType: Ref<ContextTypeEnum>,
  messages: Ref<Message[]>,
  lastProductId: Ref<string>,
  scrollPanelRef?: Ref<InstanceType<typeof ScrollPanel> | null>,
) {
  const locationStore = useLocationStore()
  const productStore = useProductStore()
  const messageInput = ref('')
  const inputDisabled = ref(false)
  const initialInteractionMade = ref(false) // Manages if an initial user interaction or context setting has occurred
  const { formatMessage } = useMessageFormatter()
  const { generateChatContext } = useChatContext()
  const { handleStream } = useChatStreamHandler()

  /**
   * Internal helper to add a formatted message from the bot or system to the messages list.
   * Relies on the messages watcher to scroll to bottom.
   * @param rawText - The raw text of the message.
   * @param model - The sender model, defaults to 'AgriBot'.
   */
  async function _addBotMessage(
    rawText: string,
    model: string = 'AgriBot',
  ): Promise<void> {
    messages.value.push({
      text: await formatMessage(rawText, false),
      isSent: false,
      model: model,
    })
  }

  /**
   * Internal helper to add a user's message to the list and send it to the chat backend.
   * @param originalText - The original, unformatted text from the user.
   */
  async function _addUserMessageAndSend(originalText: string): Promise<void> {
    if (!originalText.trim()) return // Do nothing if the message is empty or whitespace

    // User's message is formatted and pushed to the messages array
    messages.value.push({
      text: await formatMessage(originalText, true), // Format user message as sent
      isSent: true,
    })

    await sendToChat(originalText) // Send original, unformatted text to backend
  }

  const generalSuggestions: string[] = [
    'What are best practices for crop rotation?',
    'Tell me about resource-efficient farming.',
    'How to measure and improve soil health?',
  ]

  const farmSelectedSuggestions: string[] = [
    'Analyze the soil conditions for this location.',
    'Recommend profitable crops for this region.',
    "What's the optimal irrigation strategy here?",
  ]

  const dataLoadedSuggestions: string[] = [
    'Quickly interpret this data product for me.',
    'Compare this data to the regional averages.',
    'Where does this data need more attention?',
  ]

  const currentSuggestions = computed<string[]>(() => {
    if (contextType.value === ContextTypeEnum.DATA_LOADED)
      return dataLoadedSuggestions
    if (contextType.value === ContextTypeEnum.FARM_SELECTED)
      return farmSelectedSuggestions
    return generalSuggestions
  })

  /**
   * Initializes the chat state, setting initial messages based on context.
   */
  async function initializeChat(): Promise<void> {
    const targetLocation = locationStore.targetLocation
    if (targetLocation) {
      farmDataMode.value = true
      contextType.value = ContextTypeEnum.FARM_SELECTED
      await _addBotMessage(
        "I see you've selected a farm location. How can I help you with your farm today?",
      )
      initialInteractionMade.value = true // Farm selected counts as initial interaction
    } else {
      await _addBotMessage(
        "Hello! I'm AgriBot. Please use the toolbar to select a farm or start a general chat.",
      )
      // initialInteractionMade remains false until a specific action
    }
    // The watcher for productStore.selectedProduct will handle initial lastProductId and related messages.
    // scrollToBottom() // Removed: Rely on messages watcher
  }

  /**
   * Processes the 'location-selected' event.
   * Updates chat context and adds a relevant message.
   */
  async function processLocationSelected(): Promise<void> {
    farmDataMode.value = true
    contextType.value = ContextTypeEnum.FARM_SELECTED
    initialInteractionMade.value = true
    await _addBotMessage(
      'Farm location selected! How can I assist you with this area?',
    )
  }

  /**
   * Processes the 'start-general-chat' event.
   * Updates chat context and adds a relevant message.
   */
  async function processStartGeneralChat(): Promise<void> {
    farmDataMode.value = false
    contextType.value = ContextTypeEnum.GENERAL
    initialInteractionMade.value = true
    await _addBotMessage(
      "I'll be happy to help with general farming questions. Keep in mind that selecting a specific location will allow me to provide more tailored advice.",
    )
  }

  /**
   * Scrolls the chat body to the bottom to show the latest messages.
   */
  function scrollToBottom(): void {
    if (scrollPanelRef?.value) {
      const scrollPanelElement = (
        scrollPanelRef.value as unknown as { $el: HTMLElement | undefined }
      ).$el

      if (scrollPanelElement) {
        const scrollableContentElement = scrollPanelElement.querySelector(
          '.p-scrollpanel-content',
        ) as HTMLElement | null

        if (scrollableContentElement) {
          nextTick(() => {
            scrollableContentElement.scrollTop =
              scrollableContentElement.scrollHeight
          })
        }
      }
    }
  }

  /**
   * Handles error responses from the chat API.
   * @param {Response} response - The fetch Response object.
   * @param {Message} messageToUpdate - The message object to update with the error text.
   */
  async function handleErrorResponse(
    response: Response,
    messageToUpdate?: Message,
  ): Promise<void> {
    let errorText = `Error: ${response.status} ${response.statusText}`
    try {
      const errorData = await response.json()
      errorText = errorData.detail || errorData.message || errorText
    } catch {
      console.warn('Could not parse error response JSON')
    }

    if (messageToUpdate) {
      messageToUpdate.text = await formatMessage(errorText, false) // Format here for direct update
      messageToUpdate.model = 'System'
    } else {
      await _addBotMessage(errorText, 'System')
    }
  }

  /**
   * Sends a message text to the chat API and handles the streamed response.
   * @param {string} text - The message text to send (this is the original user text).
   */
  async function sendToChat(text: string): Promise<void> {
    const context = generateChatContext()
    const contextualizedText = context ? `${text} ${context}`.trim() : text

    const thinkingMessageText = 'AgriBot is thinking...'
    const botResponseInProgressMessage: Message = {
      text: await formatMessage(thinkingMessageText, false), // Format directly here
      isSent: false,
      model: 'AgriBot',
    }
    messages.value.push(botResponseInProgressMessage)

    inputDisabled.value = true

    try {
      let apiUrlToUse
      const configuredApiUrl = import.meta.env.VITE_API_URL

      // Check if running in a production environment (like Vercel)
      if (import.meta.env.PROD) {
        // In production, always use a relative path to /chat
        apiUrlToUse = '/chat'
      } else {
        // In development, use VITE_API_URL if set and not empty, otherwise fallback to default local URL
        if (configuredApiUrl && configuredApiUrl.trim() !== '') {
          apiUrlToUse = `${configuredApiUrl}/chat`
        } else {
          apiUrlToUse = 'http://127.0.0.1:8157/chat' // Default for local dev
        }
      }

      const response = await fetch(apiUrlToUse, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: contextualizedText,
          context_type: contextType.value,
          use_streaming: true, // Ensure streaming is explicitly requested if backend supports it
        }),
      })

      if (!response.ok) {
        await handleErrorResponse(response, botResponseInProgressMessage)
        return
      }

      // Use the new stream handler
      await handleStream(response, botResponseInProgressMessage, formatMessage)
    } catch (error) {
      console.error('Chat API request failed:', error)
      const errorMessageText = `Sorry, I encountered an error: ${
        (error as Error).message || 'Unknown chat connection error'
      }.`
      if (botResponseInProgressMessage) {
        botResponseInProgressMessage.text = await formatMessage(
          errorMessageText,
          false,
        )
        botResponseInProgressMessage.model = 'System'
      } else {
        // This case should ideally not be reached if botResponseInProgressMessage is always created.
        // However, as a fallback, add a new system message.
        await _addBotMessage(errorMessageText, 'System')
      }
    } finally {
      inputDisabled.value = false
    }
  }

  /**
   * Sends the user's typed message to the chat.
   */
  async function sendMessage(): Promise<void> {
    const currentMessageText = messageInput.value.trim()
    if (currentMessageText) {
      await _addUserMessageAndSend(currentMessageText)
      messageInput.value = ''
    }
  }

  /**
   * Sends a predefined suggestion message to the chat.
   * @param {string} suggestion - The suggestion text to send.
   */
  async function sendSuggestion(suggestion: string): Promise<void> {
    if (!suggestion) return

    await _addUserMessageAndSend(suggestion)
  }

  watch(
    () => locationStore.targetLocation,
    async (newLocation: TargetLocationType | null) => {
      if (newLocation) {
        farmDataMode.value = true
        contextType.value = ContextTypeEnum.FARM_SELECTED

        let messageText = `Great! I now have your farm location at latitude ${newLocation.latitude.toFixed(
          4,
        )} and longitude ${newLocation.longitude.toFixed(4)}.`

        const { selectedProduct } = productStore

        if (selectedProduct && selectedProduct.product_id) {
          const productName =
            selectedProduct.display_name || selectedProduct.product_id
          messageText += ` You currently have the "${productName}" layer selected. Click on the map if you'd like to get specific data for this point on the layer.`
        } else {
          messageText +=
            ' Please select a product layer and then click on the map to get data for this location.'
        }

        await _addBotMessage(messageText)
      } else {
        if (farmDataMode.value) {
          farmDataMode.value = false
          contextType.value = ContextTypeEnum.GENERAL
          await _addBotMessage(
            "Your farm location has been cleared. We're back to general chat.",
          )
        }
      }
    },
    { deep: true },
  )

  watch(
    () => productStore.selectedProduct,
    async (
      newProduct: selectedProductType | null,
      oldProduct: selectedProductType | null,
    ) => {
      if (newProduct && newProduct.product_id) {
        if (
          !oldProduct ||
          newProduct.product_id !== oldProduct.product_id ||
          lastProductId.value !== newProduct.product_id
        ) {
          contextType.value = ContextTypeEnum.DATA_LOADED
          const productName =
            newProduct.display_name || newProduct.product_id || 'selected data'

          let messageText = `Now viewing data for: **${productName}**.\n\n`

          if (newProduct.desc) {
            messageText += `**Description:** ${newProduct.desc}\n\n`
          }
          if (newProduct.date) {
            // Assuming date is a string. Adjust formatting if it's a Date object.
            messageText += `**Date:** ${newProduct.date}\n\n`
          }
          if (newProduct.meta && Object.keys(newProduct.meta).length > 0) {
            messageText += `**Details:**\n`
            for (const [key, value] of Object.entries(newProduct.meta)) {
              messageText += `  - ${key.replace(/_/g, ' ')}: ${value}\n` // Indent list items
            }
            messageText += `\n`
          }
          messageText += 'How can I help you analyze this?'

          lastProductId.value = newProduct.product_id // Ensure lastProductId is updated here

          await _addBotMessage(messageText)
        }
      }
    },
    { deep: true },
  )

  watch(
    messages,
    () => {
      scrollToBottom()
    },
    { deep: true, flush: 'post' },
  )

  return {
    messageInput,
    inputDisabled,
    messages, // This is the ref passed in, managed by the service
    currentSuggestions,
    formatMessage, // Expose if needed, though primarily internal now
    sendMessage,
    sendSuggestion,
    scrollToBottom,
    initializeChat,
    processLocationSelected,
    processStartGeneralChat,
    initialInteractionMade, // Expose the ref for UI binding
  }
}
