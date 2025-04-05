
import { ref, computed, watch, type Ref } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useLocationStore, type TargetLocationType } from '@/stores/locationStore';
import { useProductStore, type selectedProductType } from '@/stores/productStore';

// Define interfaces for component state
export interface Message {
  text: string;
  isSent: boolean;
  model?: string; // Optional: for identifying the sender model (e.g., "AgriBot")
}

// Enum for more robust context type management
export enum ContextTypeEnum {
  GENERAL = 'general',
  FARM_SELECTED = 'farm_selected',
  DATA_LOADED = 'data_loaded',
}

// Configure marked for safe HTML
marked.setOptions({
  breaks: true, // Add line breaks
  gfm: true, // Use GitHub Flavored Markdown
});

export function useChatService(
  farmDataMode: Ref<boolean>, 
  contextType: Ref<ContextTypeEnum>, 
  messages: Ref<Message[]>, 
  lastProductId: Ref<string>
) {
  const locationStore = useLocationStore();
  const productStore = useProductStore();
  const messageInput = ref(''); // Renamed from 'message' to avoid conflict if ChatWidget also has one
  const inputDisabled = ref(false);

  /**
   * Formats a message string using marked and DOMPurify.
   * Ensures that the input to marked() is always a string.
   * @param {string | unknown} textInput - The raw message text, which might be a string or an array.
   * @returns {string} The formatted and sanitized HTML string.
   */
  function formatMessage(textInput: string | unknown): string {
    let textToProcess: string;

    if (Array.isArray(textInput)) {
      textToProcess = textInput.join(' ');
    } else if (typeof textInput === 'string') {
      textToProcess = textInput;
    } else if (textInput === null || textInput === undefined) {
      textToProcess = '';
    } else {
      try {
        textToProcess = String(textInput);
      } catch (e) {
        return '[Error: Invalid message format]';
      }
    }

    if (!textToProcess.trim()) {
      return '';
    }

    try {
      const rawHtml = marked(textToProcess);
      return DOMPurify.sanitize(rawHtml);
    } catch (error) {
      return textToProcess
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }

  const generalSuggestions: string[] = [
    'What are best practices for crop rotation?',
    'Tell me about sustainable farming',
    'How to improve soil health?',
  ];

  const farmSelectedSuggestions: string[] = [
    'Analyze soil conditions for this location',
    'Recommend crops for this region',
    "What's the optimal irrigation strategy here?",
  ];

  const dataLoadedSuggestions: string[] = [
    'Interpret this NDVI data',
    'How does my farm compare to regional averages?',
    'Identify areas needing attention',
  ];

  const currentSuggestions = computed<string[]>(() => {
    if (contextType.value === ContextTypeEnum.DATA_LOADED) return dataLoadedSuggestions;
    if (contextType.value === ContextTypeEnum.FARM_SELECTED) return farmSelectedSuggestions;
    return generalSuggestions;
  });

  /**
   * Scrolls the chat body to the bottom to show the latest messages.
   */
  function scrollToBottom(): void {
    import('vue').then(vue => {
      vue.nextTick(() => {
        const chatBody = document.querySelector('.chat-body'); // Consider passing chatBody ref if needed
        if (chatBody) {
          chatBody.scrollTop = chatBody.scrollHeight;
        }
      });
    });
  }

  /**
   * Handles error responses from the chat API.
   * @param {Response} response - The fetch Response object.
   */
  async function handleErrorResponse(response: Response): Promise<void> {
    let errorText = `Error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorText = errorData.detail || errorData.message || errorText;
    } catch (e) {
      console.warn('Could not parse error response JSON:', e);
    }
    messages.value.push({ text: errorText, isSent: false, model: "System" });
  }

  /**
   * Sends a message text to the chat API and handles the streamed response.
   * @param {string} text - The message text to send.
   */
  async function sendToChat(text: string): Promise<void> {
    messages.value.push({ text: text, isSent: true });
    scrollToBottom();

    let context = '';

    if (
      productStore.selectedProduct &&
      Object.keys(productStore.selectedProduct).length > 0 &&
      productStore.selectedProduct.product_id
    ) {
      const product = productStore.selectedProduct;
      const productName = product.display_name || product.product_id || 'selected data';
      context += `(Dataset: ${productName}`;
      if (product.date) {
        context += `, Date: ${product.date}`;
      }
      if (product.meta) {
        const relevantMetaKeys: (keyof typeof product.meta)[] = ['type', 'source', 'crop_type', 'field_size'];
        const metaInfoParts: string[] = [];
        relevantMetaKeys.forEach((key) => {
          if (product.meta && product.meta[key]) {
            metaInfoParts.push(`${String(key)}: ${String(product.meta[key])}`);
          }
        });
        if (metaInfoParts.length > 0) {
          context += `, Meta: { ${metaInfoParts.join(', ')} }`;
        }
      }
      context += ') ';
    }

    if (
      productStore.clickedPoint && productStore.clickedPoint.show
    ) {
      const point = productStore.clickedPoint;
      const product = productStore.selectedProduct;
      let pointContext = "(Selected map data analysis: ";
      const productName = product?.display_name || product?.product_id || "Unknown Product";
      pointContext += `Product: ${productName}. `;
      if (product?.desc) {
        pointContext += `Details: ${product.desc}. `;
      }
      if (typeof point.value === 'number' && !isNaN(point.value)) {
        pointContext += `Value at selected point: ${point.value.toFixed(2)}. `;
        let interpretation = '';
        const pId = (product?.product_id || '').toLowerCase();
        const pNameLower = (product?.display_name || '').toLowerCase();
        const pDescLower = (product?.desc || '').toLowerCase();
        if (pId.includes('ndvi') || pNameLower.includes('ndvi') || pDescLower.includes('ndvi') || pNameLower.includes('normalized difference vegetation index')) {
          interpretation = `This NDVI value suggests: `;
          if (point.value > 0.7) interpretation += `Excellent vegetation health. `;
          else if (point.value > 0.5) interpretation += `Good vegetation health. `;
          else if (point.value > 0.3) interpretation += `Moderate vegetation health. `;
          else if (point.value > 0.1) interpretation += `Sparse vegetation. `;
          else interpretation += `Very sparse vegetation or bare soil. `;
        } else if (pId.includes('ndwi') || pNameLower.includes('ndwi') || pDescLower.includes('ndwi') || pNameLower.includes('normalized difference water index')) {
          interpretation = `This NDWI value suggests: ${point.value > 0.3 ? 'High' : point.value > 0 ? 'Moderate' : 'Low'} moisture content. `;
        } else if (pId.includes('evi') || pNameLower.includes('evi') || pDescLower.includes('evi') || pNameLower.includes('enhanced vegetation index')) {
          interpretation = `This EVI value suggests: ${point.value > 0.4 ? 'High biomass' : 'Low biomass'}. `;
        } else if (pId.includes('temp') || pNameLower.includes('temperature') || pDescLower.includes('temperature')) {
          interpretation = `The temperature is ${point.value.toFixed(2)} (units may vary based on source). `;
        } else if (
            pId.includes('moisture') || pId.includes('swi') || pId.includes('soil') ||
            pNameLower.includes('moisture') || pNameLower.includes('swi') || pNameLower.includes('soil') || pNameLower.includes('soil water index') ||
            pDescLower.includes('moisture') || pDescLower.includes('swi') || pDescLower.includes('soil')
        ) {
          interpretation = `This soil moisture value suggests: ${point.value > 0.6 ? 'High' : point.value > 0.3 ? 'Moderate' : 'Low'} moisture. `;
        } else if (pNameLower.includes('chirps') || pDescLower.includes('precipitation') || pNameLower.includes('precipitation')) {
            interpretation = `Precipitation amount: ${point.value.toFixed(2)} (units, e.g., mm, depend on the dataset). `;
        } else {
          interpretation = `The value for this data layer is ${point.value.toFixed(2)}. `;
        }
        pointContext += interpretation;
      } else {
        pointContext += "No specific data value available at the selected point. ";
      }
      pointContext += ") ";
      context += pointContext;
    }

    if (locationStore.targetLocation) {
      const { latitude, longitude } = locationStore.targetLocation;
      context += `(Farm location: Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}. `;
      const currentDate = new Date();
      const month = currentDate.getMonth();
      const hemisphere = latitude > 0 ? 'Northern' : 'Southern';
      let season = '';
      if (hemisphere === 'Northern') {
        if (month >= 2 && month <= 4) season = 'Spring';
        else if (month >= 5 && month <= 7) season = 'Summer';
        else if (month >= 8 && month <= 10) season = 'Autumn';
        else season = 'Winter';
      } else {
        if (month >= 2 && month <= 4) season = 'Autumn';
        else if (month >= 5 && month <= 7) season = 'Winter';
        else if (month >= 8 && month <= 10) season = 'Spring';
        else season = 'Summer';
      }
      context += `Current season: ${season}. `;
      context += ')';
    }

    const contextualizedText = context ? `${text} ${context}`.trim() : text;
    const loadingMessage: Message = { text: 'AgriBot is thinking...', isSent: false, model: "AgriBot" };
    messages.value.push(loadingMessage);
    scrollToBottom();

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
      });

      const loadingMsgIndex = messages.value.findIndex(m => m === loadingMessage);
      if (loadingMsgIndex > -1) {
        messages.value.splice(loadingMsgIndex, 1);
      }

      if (!response.ok) {
        await handleErrorResponse(response);
        return;
      }

      if (!response.body) {
        messages.value.push({ text: "Received an empty response from the server.", isSent: false, model: "System" });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamDone = false;
      let currentStreamedText = '';
      const streamResponseMessage: Message = { text: '', isSent: false, model: 'AgriBot' };
      messages.value.push(streamResponseMessage);

      while (!streamDone) {
        const { value, done } = await reader.read();
        streamDone = done;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const eventData = line.substring(5).trim();
              if (eventData === '[DONE]') {
                streamDone = true;
                break;
              }
              try {
                const parsedData = JSON.parse(eventData);
                if (parsedData.choices && parsedData.choices[0].delta?.content) {
                  currentStreamedText += parsedData.choices[0].delta.content;
                } else if (typeof parsedData.content === 'string') {
                   currentStreamedText += parsedData.content;
                }
                if (parsedData.model) {
                  streamResponseMessage.model = parsedData.model;
                }
              } catch (e) {
                 if(eventData && eventData !== '[DONE]') currentStreamedText += eventData + '\n';
              }
            } else if (line.trim()) {
              // currentStreamedText += line + '\n'; 
            }
          }
          streamResponseMessage.text = formatMessage(currentStreamedText);
          scrollToBottom();
        }
      }
      streamResponseMessage.text = formatMessage(currentStreamedText);
      scrollToBottom();

    } catch (error) {
      console.error('Chat API request failed:', error);
      const loadingMsgIndex = messages.value.findIndex(m => m.text === 'AgriBot is thinking...');
      if (loadingMsgIndex > -1) {
        messages.value.splice(loadingMsgIndex, 1);
      }
      messages.value.push({
        text: `Sorry, I encountered an error: ${(error as Error).message || 'Unknown chat connection error'}.`,
        isSent: false,
        model: "System"
      });
    } finally {
      inputDisabled.value = false;
      scrollToBottom();
    }
  }

  /**
   * Sends the user's typed message to the chat.
   */
  async function sendMessage(): Promise<void> {
    const currentMessageText = messageInput.value.trim();
    if (!currentMessageText) return;

    inputDisabled.value = true;
    await sendToChat(currentMessageText);
    messageInput.value = ''; // Clear input field
    inputDisabled.value = false;
  }

  /**
   * Sends a predefined suggestion message to the chat.
   * @param {string} suggestion - The suggestion text to send.
   */
  async function sendSuggestion(suggestion: string): Promise<void> {
    if (!suggestion) return;
    inputDisabled.value = true;
    await sendToChat(suggestion);
    inputDisabled.value = false;
  }
  
  // Watchers related to chat context and messages, moved from ChatWidget
  watch(
    () => locationStore.targetLocation,
    (newLocation: TargetLocationType | null) => {
      if (newLocation) {
        if (!farmDataMode.value) {
          farmDataMode.value = true;
          contextType.value = ContextTypeEnum.FARM_SELECTED;
          messages.value.push({
            text: `Great! I now have your farm location at latitude ${newLocation.latitude.toFixed(
              4
            )} and longitude ${newLocation.longitude.toFixed(
              4
            )}. How can I help with your farm?`,
            isSent: false,
            model: "AgriBot"
          });
        }
      } else {
        if (farmDataMode.value) {
          farmDataMode.value = false;
          contextType.value = ContextTypeEnum.GENERAL;
          messages.value.push({
            text: "Your farm location has been cleared. We're back to general chat.",
            isSent: false,
            model: "AgriBot"
          });
        }
      }
    },
    { deep: true }
  );

  watch(
    () => productStore.selectedProduct,
    (newProduct: selectedProductType | null) => {
      if (
        newProduct &&
        Object.keys(newProduct).length > 0 &&
        newProduct.product_id
      ) {
        if (lastProductId.value !== newProduct.product_id) {
          contextType.value = ContextTypeEnum.DATA_LOADED;
          const productName =
            newProduct.display_name || newProduct.product_id || 'selected';
          messages.value.push({
            text: `I see you're viewing ${productName} data. Would you like me to analyze this for your farm?`,
            isSent: false,
            model: "AgriBot"
          });
          lastProductId.value = newProduct.product_id;
        }
      }
    },
    { deep: true }
  );

  return {
    messageInput,
    inputDisabled,
    messages,
    currentSuggestions,
    formatMessage,
    sendMessage,
    sendSuggestion,
    scrollToBottom, // Exposing for potential direct use if needed
  };
}
