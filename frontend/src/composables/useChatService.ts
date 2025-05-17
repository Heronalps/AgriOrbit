import { ref, computed, watch, type Ref, nextTick } from 'vue' // Added nextTick
import { useMessageFormatter } from './useMessageFormatter'
import { useChatContext } from './useChatContext' // Added
import { useChatStreamHandler } from './useChatStreamHandler' // Added
import {
  useLocationStore,
  type TargetLocationType,
} from '@/stores/locationStore'
import { useProductStore } from '@/stores/productStore'
// import { usePointDataStore } from '@/stores/pointDataStore'; // Commented out unused import
import type { selectedProductType } from '@/stores/productStore'
import type ScrollPanel from 'primevue/scrollpanel' // Import ScrollPanel type

// Define interfaces for component state
export interface Message {
  text: string
  isSent: boolean
  model?: string // Optional: for identifying the sender model (e.g., "AgriBot")
}

// Enum for more robust context type management
export enum ContextTypeEnum {
  GENERAL = 'general',
  FARM_SELECTED = 'farm_selected',
  DATA_LOADED = 'data_loaded',
}

export function useChatService(
  farmDataMode: Ref<boolean>,
  contextType: Ref<ContextTypeEnum>,
  messages: Ref<Message[]>,
  lastProductId: Ref<string>,
  scrollPanelRef?: Ref<InstanceType<typeof ScrollPanel> | null>, // Updated to accept ScrollPanel instance ref
) {
  const locationStore = useLocationStore()
  const productStore = useProductStore()
  // const pointDataStore = usePointDataStore() // Added
  const messageInput = ref('')
  const inputDisabled = ref(false)
  const { formatMessage } = useMessageFormatter()
  const { generateChatContext } = useChatContext() // Added
  const { handleStream } = useChatStreamHandler() // Added

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
    'What areas in this data need more attention?',
  ]

  const currentSuggestions = computed<string[]>(() => {
    if (contextType.value === ContextTypeEnum.DATA_LOADED)
      return dataLoadedSuggestions
    if (contextType.value === ContextTypeEnum.FARM_SELECTED)
      return farmSelectedSuggestions
    return generalSuggestions
  })

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
    const formattedError = await formatMessage(errorText, false)
    if (messageToUpdate) {
      messageToUpdate.text = formattedError
      messageToUpdate.model = 'System'
    } else {
      messages.value.push({
        text: formattedError,
        isSent: false,
        model: 'System',
      })
    }
    scrollToBottom()
  }

  /**
   * Sends a message text to the chat API and handles the streamed response.
   * @param {string} text - The message text to send (this is the original user text).
   */
  async function sendToChat(text: string): Promise<void> {
    const context = generateChatContext()
    const contextualizedText = context ? `${text} ${context}`.trim() : text

    const thinkingMessageText = 'AgriBot is thinking...'
    const formattedThinkingMessage = await formatMessage(
      thinkingMessageText,
      false,
    )
    const botResponseInProgressMessage: Message = {
      text: formattedThinkingMessage,
      isSent: false,
      model: 'AgriBot',
    }
    messages.value.push(botResponseInProgressMessage)
    // scrollToBottom() // Watch in ChatWidget.vue will handle this

    inputDisabled.value = true

    try {
      const response = await fetch('http://127.0.0.1:8157/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: contextualizedText,
          context_type: contextType.value,
        }),
      })

      if (!response.ok) {
        await handleErrorResponse(response, botResponseInProgressMessage)
        return
      }

      // Use the new stream handler
      await handleStream(response, botResponseInProgressMessage, formatMessage)

      // scrollToBottom(); // Watch in ChatWidget.vue will handle this
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
        messages.value.push({
          text: await formatMessage(errorMessageText, false),
          isSent: false,
          model: 'System',
        })
      }
      scrollToBottom()
    } finally {
      inputDisabled.value = false
      scrollToBottom()
    }
  }

  /**
   * Sends the user's typed message to the chat.
   */
  async function sendMessage(): Promise<void> {
    const currentMessageText = messageInput.value.trim()
    if (!currentMessageText) return

    const userMessage: Message = {
      text: await formatMessage(currentMessageText, true),
      isSent: true,
    }
    messages.value.push(userMessage)

    await sendToChat(currentMessageText)
    messageInput.value = ''
  }

  /**
   * Sends a predefined suggestion message to the chat.
   * @param {string} suggestion - The suggestion text to send.
   */
  async function sendSuggestion(suggestion: string): Promise<void> {
    if (!suggestion) return

    const userMessage: Message = {
      text: await formatMessage(suggestion, true),
      isSent: true,
    }
    messages.value.push(userMessage)

    await sendToChat(suggestion)
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

        messages.value.push({
          text: await formatMessage(messageText, false),
          isSent: false,
          model: 'AgriBot',
        })
      } else {
        if (farmDataMode.value) {
          farmDataMode.value = false
          contextType.value = ContextTypeEnum.GENERAL
          messages.value.push({
            text: await formatMessage(
              "Your farm location has been cleared. We're back to general chat.",
              false,
            ),
            isSent: false,
            model: 'AgriBot',
          })
        }
      }
      scrollToBottom()
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
            // Pass the description directly, newline normalization will be handled by formatMessage
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

          messages.value.push({
            text: await formatMessage(messageText, false), // formatMessage will handle markdown
            isSent: false,
            model: 'AgriBot',
          })
          // scrollToBottom(); // Watch in ChatWidget.vue or the messages watcher here will handle this
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
    messages,
    currentSuggestions,
    formatMessage,
    sendMessage,
    sendSuggestion,
    scrollToBottom,
  }
}
