import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import { marked } from 'marked'
import type { MarkedOptions } from 'marked'
import DOMPurify from 'dompurify'
import { useLocationStore } from '@/stores/locationStore'
import type { TargetLocationType } from '@/stores/locationStore'
import { useProductStore } from '@/stores/productStore'
import type { selectedProductType } from '@/stores/productStore'

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

// Configure marked for safe HTML
const markedOptions: MarkedOptions = {
  breaks: true, // Convert GFM line breaks to <br>
  gfm: true, // Use GitHub Flavored Markdown
}
marked.setOptions(markedOptions)

export function useChatService(
  farmDataMode: Ref<boolean>,
  contextType: Ref<ContextTypeEnum>,
  messages: Ref<Message[]>,
  lastProductId: Ref<string>,
) {
  const locationStore = useLocationStore()
  const productStore = useProductStore()
  const messageInput = ref('')
  const inputDisabled = ref(false)

  /**
   * Formats a message string using marked and DOMPurify.
   * Ensures that the input to marked() is always a string.
   * @param {string | unknown} textInput - The raw message text.
   * @param {boolean} isUserInput - Flag to determine if the input is from the user.
   * @returns {Promise<string>} The formatted and sanitized HTML string.
   */
  async function formatMessage(
    textInput: string | unknown,
    isUserInput = false,
  ): Promise<string> {
    let textToProcess: string

    if (Array.isArray(textInput)) {
      textToProcess = textInput.join(' ')
    } else if (typeof textInput === 'string') {
      textToProcess = textInput
    } else if (textInput === null || textInput === undefined) {
      textToProcess = ''
    } else {
      try {
        textToProcess = String(textInput)
      } catch (e) {
        return '[Error: Invalid message format]'
      }
    }

    if (isUserInput) {
      const escapedText = textToProcess
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
      return DOMPurify.sanitize(escapedText, {
        USE_PROFILES: { html: false },
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      })
    }

    // Ensure newlines are just \n for marked processing for bot messages
    textToProcess = textToProcess.replace(/\r\n/g, '\n')

    if (!textToProcess.trim()) {
      return ''
    }

    try {
      const rawHtml = await Promise.resolve(marked(textToProcess))
      return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } })
    } catch (error) {
      console.error('Error during message formatting:', error)
      return textToProcess
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }
  }

  const generalSuggestions: string[] = [
    'What are best practices for crop rotation?',
    'Tell me about sustainable farming',
    'How to improve soil health?',
  ]

  const farmSelectedSuggestions: string[] = [
    'Analyze soil conditions for this location',
    'Recommend crops for this region',
    "What's the optimal irrigation strategy here?",
  ]

  const dataLoadedSuggestions: string[] = [
    'Interpret this NDVI data',
    'How does my farm compare to regional averages?',
    'Identify areas needing attention',
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
    import('vue').then((vue) => {
      vue.nextTick(() => {
        const chatBody = document.querySelector('.chat-body') // Consider passing chatBody ref if needed
        if (chatBody) {
          chatBody.scrollTop = chatBody.scrollHeight
        }
      })
    })
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
    } catch (e) {
      console.warn('Could not parse error response JSON:', e)
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
   * @param {string} text - The message text to send.
   */
  async function sendToChat(text: string): Promise<void> {
    messages.value.push({ text: await formatMessage(text, true), isSent: true })
    scrollToBottom()

    let context = ''
    const { selectedProduct, clickedPoint } = productStore

    if (selectedProduct && selectedProduct.product_id) {
      const productName =
        selectedProduct.display_name ||
        selectedProduct.product_id ||
        'selected data layer'
      context += `(Dataset: ${productName}`
      if (selectedProduct.date) {
        context += `, Date: ${selectedProduct.date}`
      }
      if (selectedProduct.meta) {
        const metaParts: string[] = []
        if (selectedProduct.meta.type)
          metaParts.push(`Type: ${selectedProduct.meta.type}`)
        if (selectedProduct.meta.source)
          metaParts.push(`Source: ${selectedProduct.meta.source}`)
        if (metaParts.length > 0) {
          context += `, Meta: { ${metaParts.join(', ')} }`
        }
      }
      context += ') '
    }

    if (clickedPoint && clickedPoint.show) {
      if (
        typeof clickedPoint.value === 'number' &&
        !isNaN(clickedPoint.value)
      ) {
        const productNameForPoint =
          selectedProduct?.display_name ||
          selectedProduct?.product_id ||
          'the current data layer'
        let pointContext = `(Selected map data: Value ${clickedPoint.value.toFixed(
          2,
        )} for ${productNameForPoint}`
        if (selectedProduct?.date) {
          pointContext += ` on ${selectedProduct.date}`
        }
        if (
          clickedPoint.longitude !== undefined &&
          clickedPoint.latitude !== undefined
        ) {
          pointContext += ` at Lon: ${clickedPoint.longitude.toFixed(
            4,
          )}, Lat: ${clickedPoint.latitude.toFixed(4)}`
        }
        pointContext += '.) '
        context += pointContext
      } else if (clickedPoint.errorMessage) {
        context += `(Note: Issue fetching data for clicked point: ${clickedPoint.errorMessage}) `
      }
    }

    if (locationStore.targetLocation) {
      const { latitude, longitude } = locationStore.targetLocation
      context += `(Farm location: Lat ${latitude.toFixed(
        4,
      )}, Lon ${longitude.toFixed(4)}. `
      const currentDate = new Date()
      const month = currentDate.getMonth()
      const hemisphere = latitude > 0 ? 'Northern' : 'Southern'
      let season = ''
      if (hemisphere === 'Northern') {
        if (month >= 2 && month <= 4) season = 'Spring'
        else if (month >= 5 && month <= 7) season = 'Summer'
        else if (month >= 8 && month <= 10) season = 'Autumn'
        else season = 'Winter'
      } else {
        if (month >= 2 && month <= 4) season = 'Autumn'
        else if (month >= 5 && month <= 7) season = 'Winter'
        else if (month >= 8 && month <= 10) season = 'Spring'
        else season = 'Summer'
      }
      context += `Current season: ${season}. Current Date: ${
        currentDate.toISOString().split('T')[0]
      }.`
      context += ')'
    }

    const contextualizedText = context ? `${text} ${context}`.trim() : text

    // Create and add the message object that will be updated
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
    scrollToBottom()

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
        await handleErrorResponse(response, botResponseInProgressMessage) // Pass message to update
        return
      }

      if (!response.body) {
        botResponseInProgressMessage.text = await formatMessage(
          'Received an empty response from the server.',
          false,
        )
        botResponseInProgressMessage.model = 'System'
        scrollToBottom()
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let streamDone = false
      let currentStreamedText = ''

      // Update botResponseInProgressMessage directly with streamed content
      botResponseInProgressMessage.text = '' // Clear "Thinking..." text before streaming starts

      while (!streamDone) {
        const { value, done } = await reader.read()
        streamDone = done
        if (value) {
          const chunk = decoder.decode(value, { stream: !done })
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const eventData = line.substring(5).trim()
              if (eventData === '[DONE]') {
                streamDone = true
                break
              }
              try {
                const parsedData = JSON.parse(eventData)
                if (
                  parsedData.choices &&
                  parsedData.choices[0].delta?.content
                ) {
                  currentStreamedText += parsedData.choices[0].delta.content
                } else if (typeof parsedData.content === 'string') {
                  currentStreamedText += parsedData.content
                }
                if (parsedData.model) {
                  botResponseInProgressMessage.model = parsedData.model
                }
              } catch (e) {
                if (eventData && eventData !== '[DONE]') {
                  currentStreamedText +=
                    eventData + (eventData.endsWith('\n') ? '' : '\n')
                }
              }
            }
          }
          botResponseInProgressMessage.text = await formatMessage(
            currentStreamedText,
            false,
          )
          scrollToBottom()
        }
      }
      // Ensure final text is set
      botResponseInProgressMessage.text = await formatMessage(
        currentStreamedText,
        false,
      )
      scrollToBottom()
    } catch (error) {
      console.error('Chat API request failed:', error)
      const errorMessageText = `Sorry, I encountered an error: ${
        (error as Error).message || 'Unknown chat connection error'
      }.`
      botResponseInProgressMessage.text = await formatMessage(
        errorMessageText,
        false,
      )
      botResponseInProgressMessage.model = 'System'
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

    inputDisabled.value = true
    await sendToChat(currentMessageText) // sendToChat will add the user message
    messageInput.value = ''
    inputDisabled.value = false
  }

  /**
   * Sends a predefined suggestion message to the chat.
   * @param {string} suggestion - The suggestion text to send.
   */
  async function sendSuggestion(suggestion: string): Promise<void> {
    if (!suggestion) return

    inputDisabled.value = true
    await sendToChat(suggestion) // sendToChat will add the user message
    inputDisabled.value = false
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
          let messageText = `Now viewing data for: ${productName}.`

          if (newProduct.desc) {
            const normalizedDesc = newProduct.desc.replace(/\r\n/g, '\n')
            messageText += ` Description: ${normalizedDesc}.`
          }
          if (newProduct.date) {
            messageText += ` Date: ${newProduct.date}.`
          }
          if (newProduct.meta) {
            const metaArray: string[] = []
            for (const [key, value] of Object.entries(newProduct.meta)) {
              if (
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'
              ) {
                metaArray.push(`${key}: ${value}`)
              }
            }
            if (metaArray.length > 0) {
              messageText += ` Meta: { ${metaArray.join(', ')} }.`
            }
          }
          messageText += ' How can I help you analyze this?'

          messages.value.push({
            text: await formatMessage(messageText, false),
            isSent: false,
            model: 'AgriBot',
          })
          lastProductId.value = newProduct.product_id
          scrollToBottom()
        }
      }
    },
    { deep: true },
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
