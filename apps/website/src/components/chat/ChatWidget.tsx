'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { LeadGateForm } from './LeadGateForm'
import { MessageList, type ChatMessage } from './MessageList'
import { ProductRecommendationCard, type ProductRec } from './ProductRecommendationCard'
import { RFQCartDrawer } from './RFQCartDrawer'
import { AppointmentPicker } from './AppointmentPicker'
import { ViberHandoff } from './ViberHandoff'
import { getQuoteCart, addToQuoteCart, setQuoteCartLeadId } from '@/components/QuoteCart'
import siteConfig from '@/data/site-config.json'
import './chat.css'

const BUBBLE_POS_KEY = 'homeu_chat_bubble_pos'
const BUBBLE_LOGO = 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/uploads/efd19283f64781b5bde261b2ddfb68f2168affb76ed6e34f642c1b3b0f58d8af.png'

interface CustomerProfile {
  id: string
  name?: string
  email?: string
  phone?: string
  company?: string
}

async function getLoggedInCustomer(): Promise<CustomerProfile | null> {
  try {
    const res = await fetch('/api/customers/me')
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ── State Machine ─────────────────────────────────────────────

type ChatState =
  | 'idle'
  | 'greeting'
  | 'lead_gate'
  | 'chat_active'
  | 'showing_products'
  | 'rfq_cart'
  | 'appointment'
  | 'viber_handoff'
  | 'submitting'
  | 'success'
  | 'error'

interface LeadData {
  name: string
  email: string
  mobile: string
  buyerType?: string
  companyName?: string
}

interface WidgetConfig {
  viberNumber: string
  viberName: string
  enableChat: boolean
  greetingDelay: number
  productPageDelay: number
}

const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  viberNumber: '',
  viberName: 'HomeU Sales Team',
  enableChat: true,
  greetingDelay: 4000,
  productPageDelay: 7000,
}

export function ChatWidget() {
  // Admin-configurable (Settings → Notifications). Fetched at mount since
  // this is a client component and can't read DB/server env at render time.
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>(DEFAULT_WIDGET_CONFIG)
  const [widgetConfigLoaded, setWidgetConfigLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/chat/widget-config')
      .then(r => r.json())
      .then(d => setWidgetConfig({ ...DEFAULT_WIDGET_CONFIG, ...d }))
      .catch(() => {})
      .finally(() => setWidgetConfigLoaded(true))
  }, [])
  // ── State ─────────────────────────────────────────────────
  const [state, setState] = useState<ChatState>('idle')
  const [isOpen, setIsOpen] = useState(false)
  const [leadData, setLeadData] = useState<LeadData | null>(null)
  const [leadId, setLeadId] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<ProductRec[]>([])
  const [rfqDrawerOpen, setRfqDrawerOpen] = useState(false)
  const [error, setError] = useState('')
  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [customerLoaded, setCustomerLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Draggable launcher bubble ─────────────────────────────
  const bubbleRef = useRef<HTMLButtonElement>(null)
  const [bubblePos, setBubblePos] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const posRef = useRef<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean; pointerId: number } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUBBLE_POS_KEY)
      if (raw) {
        const p = JSON.parse(raw)
        if (typeof p?.x === 'number' && typeof p?.y === 'number') { setBubblePos(p); posRef.current = p }
      }
    } catch { /* ignore */ }
  }, [])

  const onBubblePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const el = bubbleRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top, moved: false, pointerId: e.pointerId }
    try { el.setPointerCapture(e.pointerId) } catch { /* ignore */ }
  }, [])

  const onBubblePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const ds = dragRef.current
    if (!ds || ds.pointerId !== e.pointerId) return
    const dx = e.clientX - ds.startX
    const dy = e.clientY - ds.startY
    if (!ds.moved && Math.hypot(dx, dy) < 5) return // ignore tiny jitter → treat as click
    ds.moved = true
    if (!dragging) setDragging(true)
    const size = bubbleRef.current?.offsetWidth || 60
    const nx = Math.max(8, Math.min(window.innerWidth - size - 8, ds.origX + dx))
    const ny = Math.max(8, Math.min(window.innerHeight - size - 8, ds.origY + dy))
    const next = { x: nx, y: ny }
    posRef.current = next
    setBubblePos(next)
  }, [dragging])

  const onBubblePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const ds = dragRef.current
    dragRef.current = null
    try { bubbleRef.current?.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    if (ds && ds.moved) {
      setDragging(false)
      if (posRef.current) { try { localStorage.setItem(BUBBLE_POS_KEY, JSON.stringify(posRef.current)) } catch { /* ignore */ } }
    } else {
      toggleChat() // a real click, not a drag
    }
  }, [])

  const greetingDelay = widgetConfig.greetingDelay
  const productPageDelay = widgetConfig.productPageDelay

  // ── Check if user is logged in ──────────────────────────────
  useEffect(() => {
    getLoggedInCustomer().then(user => {
      if (user?.id) {
        setCustomer(user)
        // Pre-fill lead data from customer profile
        setLeadData({
          name: user.name || '',
          email: user.email || '',
          mobile: user.phone || '',
        })
      }
      setCustomerLoaded(true)
    })
  }, [])

  // ── Proactive Greeting ────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('homeu_chat_dismissed') === 'true') return
    if (!customerLoaded) return // Wait for customer check

    // Detect page type
    const path = window.location.pathname
    const delay = path.startsWith('/products/') ? productPageDelay : path.startsWith('/quote-cart') ? 0 : greetingDelay

    if (path.startsWith('/quote-cart')) {
      const timer = setTimeout(async () => {
        setIsOpen(true)
        // If logged-in customer on RFQ page, skip lead gate
        if (customer?.id) {
          await handleAutoLead(customer)
        } else {
          setState('lead_gate')
        }
      }, 500)
      return () => clearTimeout(timer)
    }

    const timer = setTimeout(() => {
      setIsOpen(true)
      if (customer?.id) {
        // Returning customer — greet personally, skip lead gate
        setState('chat_active')
        addBotMessage(`Welcome back, ${customer.name?.split(' ')[0] || 'there'}! How can I help you with your furniture or lighting needs today?`)
        setQuickReplies(['Find a product', 'Upload a photo', 'Request quotation', 'Book showroom visit', 'View my RFQs'])
        // Create lead session (auto-linked)
        handleAutoLead(customer)
      } else {
        setState('greeting')
        addBotMessage('Hi! Looking for furniture or lighting? You can send a photo, describe what you need, or add items to your RFQ cart. Would you like help finding a product or booking a showroom visit?')
        setQuickReplies(['Find a product', 'Upload a photo', 'Request quotation', 'Book showroom visit'])
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [greetingDelay, productPageDelay, customerLoaded, customer?.id])

  // ── Auto-create lead for logged-in customers ────────────────
  const handleAutoLead = useCallback(async (cust: CustomerProfile) => {
    if (!cust?.id || leadId) return // Already have a lead session
    // Guard: email and mobile are required by the API — skip if empty
    if (!cust.email?.trim() || !cust.phone?.trim()) return

    try {
      const res = await fetch('/api/chat/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cust.name || 'Customer',
          email: cust.email.trim(),
          mobile: cust.phone.trim(),
          customerId: cust.id,
          sourcePage: window.location.pathname,
          consent: true,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setLeadId(data.leadId)
        setConversationId(data.conversationId)
        setQuoteCartLeadId(data.leadId) // Persist for server-side cart sync
      }
    } catch (err) {
      console.error('[ChatWidget] Auto-lead creation failed:', err instanceof Error ? err.message : err)
    }
  }, [leadId])

  // ── Helpers ───────────────────────────────────────────────
  const msgCounter = useRef(0)
  function nextMsgId() { return `msg-${Date.now()}-${++msgCounter.current}` }

  function addBotMessage(content: string) {
    setMessages(prev => [...prev, {
      id: nextMsgId(), sender: 'bot', content, type: 'text', timestamp: new Date(),
    }])
  }

  function addVisitorMessage(content: string) {
    setMessages(prev => [...prev, {
      id: nextMsgId(), sender: 'visitor', content, type: 'text', timestamp: new Date(),
    }])
  }

  function addSystemMessage(content: string) {
    setMessages(prev => [...prev, {
      id: nextMsgId(), sender: 'system' as any, content, type: 'system' as any, timestamp: new Date(),
    }])
  }

  // ── Lead Gate Submit ──────────────────────────────────────
  const handleLeadSubmit = useCallback(async (data: LeadData) => {
    setState('submitting')
    const res = await fetch('/api/chat/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        sourcePage: window.location.pathname,
        consent: true,
      }),
    })

    if (!res.ok) {
      const errData = await res.json()
      throw new Error(errData.error || 'Failed to create lead')
    }

    const result = await res.json()
    setLeadData(data)
    setLeadId(result.leadId)
    setConversationId(result.conversationId)
    setQuoteCartLeadId(result.leadId) // Persist for server-side cart sync
    addSystemMessage(`Connected as ${data.name}`)
    addBotMessage(`Thanks, ${data.name.split(' ')[0]}! How can I help you today? You can describe what you need, upload a photo, or browse our catalog.`)
    setQuickReplies(['Find a product', 'Upload a photo', 'Request quotation', 'Book showroom visit'])
    setState('chat_active')
  }, [])

  // ── Send Message ──────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !leadId) return

    addVisitorMessage(text)
    setInputValue('')
    setQuickReplies([])
    setIsTyping(true)

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          leadId,
          message: text,
          currentPage: window.location.pathname,
        }),
      })

      if (!res.ok) throw new Error('API error')

      const data = await res.json()
      setIsTyping(false)

      if (data.reply) {
        addBotMessage(data.reply)
      }

      if (data.productRecommendations?.length > 0) {
        setRecommendations(data.productRecommendations)
        setState('showing_products')
        for (const rec of data.productRecommendations) {
          setMessages(prev => [...prev, {
            id: nextMsgId(), sender: 'bot' as any, type: 'product_card' as any,
            content: '', timestamp: new Date(),
            metadata: rec,
          }])
        }
      }

      if (data.quickReplies?.length > 0) {
        setQuickReplies(data.quickReplies)
      }

      if (data.shouldOfferViber) {
        setState('viber_handoff')
      }

      if (data.actions?.includes('OFFER_APPOINTMENT')) {
        setState('appointment')
      }
    } catch {
      setIsTyping(false)
      addBotMessage('Something went wrong. Please try again or contact our sales team.')
      setQuickReplies(['Try again', 'Contact sales on Viber'])
    }
  }, [leadId, conversationId])

  // ── Quick Reply Handler ───────────────────────────────────
  const handleQuickReply = useCallback((reply: string) => {
    switch (reply) {
      case 'Upload a photo':
      case 'Upload photo':
        handleImageUpload()
        break
      case 'Book showroom visit':
      case 'Book showroom':
      case 'Pick a date':
        setState('appointment')
        addBotMessage('Would you like to book a showroom visit? Please choose your preferred date, time, and number of visitors.')
        break
      case 'Contact sales on Viber':
      case 'Contact sales':
        setState('viber_handoff')
        break
      case 'Add to RFQ':
      case 'Add to RFQ cart':
      case 'Prepare RFQ':
        setRfqDrawerOpen(true)
        addBotMessage('You can review your RFQ cart and submit it to our sales team.')
        break
      case 'Request quotation':
        sendMessage('I would like to request a quotation')
        break
      case 'Find a product':
      case 'Describe differently':
      case 'Describe instead':
        addBotMessage('Sure! Please describe what you\'re looking for — style, material, color, or room type.')
        setTimeout(() => inputRef.current?.focus(), 100)
        break
      case 'Show more options':
        sendMessage('Show more product options')
        break
      case 'Send inquiry to admin':
        sendMessage('Please connect me with your sales team')
        break
      default:
        sendMessage(reply)
    }
  }, [sendMessage])

  // ── Image Upload (shared by button + paste) ──────────────
  const uploadImageFile = useCallback(async (file: File) => {
    if (!leadId) return

    addVisitorMessage(`📷 Uploaded: ${file.name}`)
    setIsTyping(true)

    const formData = new FormData()
    formData.append('image', file)
    formData.append('leadId', leadId)
    formData.append('conversationId', conversationId || '')

    try {
      const res = await fetch('/api/chat/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')

      const data = await res.json()
      setIsTyping(false)

      if (data.reply) addBotMessage(data.reply)

      if (data.recommendations?.length > 0) {
        setRecommendations(data.recommendations)
        setState('showing_products')
        for (const rec of data.recommendations) {
          setMessages(prev => [...prev, {
            id: nextMsgId(), sender: 'bot' as any, type: 'product_card' as any,
            content: '', timestamp: new Date(), metadata: rec,
          }])
        }
        setQuickReplies(['Add to RFQ cart', 'Book showroom visit'])
      } else {
        addBotMessage(`I couldn't find exact matches. Could you describe what you need?`)
        setQuickReplies(['Describe instead', 'Contact sales on Viber'])
      }
    } catch {
      setIsTyping(false)
      addBotMessage('Failed to process the image. Could you describe what you\'re looking for instead?')
    }
  }, [leadId, conversationId])

  // ── Image Upload (button) ────────────────────────────────
  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp,image/gif'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      await uploadImageFile(file)
    }
    input.click()
  }, [uploadImageFile])

  // ── Image Paste Handler ──────────────────────────────────
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          uploadImageFile(file)
        }
        return
      }
    }

    // Also check clipboardData.files directly (broader support)
    const files = e.clipboardData?.files
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          e.preventDefault()
          uploadImageFile(files[i])
          return
        }
      }
    }

    // If pasted text looks like a raw filename (e.g. "image.png"),
    // swallow it to avoid sending "image.png" as a chat message
    const text = e.clipboardData?.getData('text')
    if (text && /^[\w,\s-]+\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(text.trim())) {
      e.preventDefault()
      setMessages(prev => [...prev, {
        id: nextMsgId(), sender: 'bot', content: 'Please use the 📷 button to upload images, or paste an image directly from your clipboard (Ctrl+V on the image itself, not the filename).',
        type: 'text', timestamp: new Date(),
      }])
      setQuickReplies(['Upload a photo', 'Describe instead'])
    }
  }, [uploadImageFile, setQuickReplies])

  // ── Add to RFQ from Recommendation ──────────────────────
  const handleAddToRFQ = useCallback((product: ProductRec) => {
    addToQuoteCart({
      productId: product.productId,
      title: product.title,
      price: product.referencePrice,
      quantity: 1,
    })
    addBotMessage(`Added **${product.title}** to your RFQ cart! You can add more items or submit when ready.`)

    // Also notify server
    fetch('/api/rfq/add-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId,
        conversationId,
        productId: product.productId,
        productTitle: product.title,
        quantity: 1,
        matchType: product.matchType,
      }),
    }).catch(() => {})

    setQuickReplies(['View RFQ cart', 'Add more items', 'Submit RFQ'])
  }, [leadId, conversationId])

  // ── Appointment Handlers ─────────────────────────────────
  const handleAppointmentSuccess = useCallback(() => {
    setState('success')
    addBotMessage('Thank you! Your showroom visit request has been sent. Our team will confirm your schedule.')
    setQuickReplies(['Contact sales on Viber', 'Continue browsing'])
  }, [])

  const handleAppointmentError = useCallback((err: string) => {
    setError(err)
  }, [])

  const handleAppointmentCancel = useCallback(() => {
    setState('chat_active')
    addBotMessage('No problem! Let me know if you need anything else.')
    setQuickReplies(['Find a product', 'Request quotation', 'Contact sales on Viber'])
  }, [])

  // ── Viber Handoff ────────────────────────────────────────
  const handleSendRFQToSales = useCallback(() => {
    setRfqDrawerOpen(true)
    addBotMessage('Your RFQ cart is ready for review. Submit it and our sales team will prepare a quotation.')
  }, [])

  const handleViberClose = useCallback(() => {
    setState('chat_active')
    addBotMessage('Alright! Let me know if you need anything else.')
  }, [])

  // ── Submit Message via Enter ─────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }, [inputValue, sendMessage])

  // ── Toggle Open/Close ────────────────────────────────────
  const toggleChat = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) {
        // Opening: if returning visitor with lead data, go to chat
        if (leadId) {
          setState('chat_active')
        } else {
          setState('greeting')
          addBotMessage('Welcome back! Would you like to continue where you left off?')
          setQuickReplies(['Find a product', 'Request quotation', 'Book showroom visit'])
        }
      }
      return !prev
    })
  }, [leadId])

  // ── Render ───────────────────────────────────────────────
  const showBubble = true // Always show bubble

  // Admin can disable the widget entirely (Settings → Notifications)
  // Also suppress in theme editor preview iframe (ThemeEditor adds ?suppressChat=1)
  const suppressChatPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('suppressChat')
  if ((widgetConfigLoaded && !widgetConfig.enableChat) || suppressChatPreview) return null

  return (
    <>
      {/* Floating Bubble — draggable, logo icon, attention bounce + moving color ring */}
      <button
        ref={bubbleRef}
        className={`chat-bubble${isOpen ? ' chat-bubble--open' : ''}${dragging ? ' chat-bubble--dragging' : ''}`}
        onPointerDown={onBubblePointerDown}
        onPointerMove={onBubblePointerMove}
        onPointerUp={onBubblePointerUp}
        style={bubblePos ? { left: bubblePos.x, top: bubblePos.y, right: 'auto', bottom: 'auto' } : undefined}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        title="HomeU Concierge — drag to move"
      >
        {BUBBLE_LOGO
          ? <img className="chat-bubble-logo" src={BUBBLE_LOGO} alt="HomeU" draggable={false} />
          : <span className="chat-bubble-logo chat-bubble-logo--fallback">💬</span>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-avatar" style={{ overflow: 'hidden', background: '#fff' }}>
              <img src={BUBBLE_LOGO} alt="HomeU" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="chat-header-info">
              <p className="chat-header-title">HomeU Concierge</p>
              <p className="chat-header-status">Furniture & Lighting Assistant</p>
            </div>
            <button className="chat-header-close" onClick={toggleChat} aria-label="Close chat">✕</button>
          </div>

          {/* Lead Gate */}
          {state === 'lead_gate' && !leadId && (
            <LeadGateForm onSubmit={handleLeadSubmit} sourcePage={typeof window !== 'undefined' ? window.location.pathname : ''} />
          )}

          {/* Chat Messages (after lead gate) */}
          {(state === 'chat_active' || state === 'showing_products' || state === 'greeting' || state === 'submitting' || state === 'success' || state === 'error') && leadId && (
            <>
              <MessageList messages={messages} isTyping={isTyping} />

              {/* Product Recommendations */}
              {recommendations.length > 0 && state === 'showing_products' && (
                <div style={{ padding: '0 12px 8px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', flexShrink: 0 }}>
                  {recommendations.map(rec => (
                    <ProductRecommendationCard key={rec.productId} product={rec} onAddToRFQ={handleAddToRFQ} />
                  ))}
                </div>
              )}

              {/* Quick Replies */}
              {quickReplies.length > 0 && (
                <div className="chat-quick-replies">
                  {quickReplies.map(reply => (
                    <button key={reply} className="chat-quick-reply-btn" onClick={() => handleQuickReply(reply)}>
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              {/* Success State */}
              {state === 'success' && (
                <div className="chat-success">
                  <div className="chat-success-icon">✅</div>
                  <h3>All Set!</h3>
                  <p>Your request has been sent to our team. We'll get back to you shortly.</p>
                  <button className="chat-success-btn" onClick={() => { setState('chat_active'); setQuickReplies(['Browse products', 'Contact sales on Viber']) }}>
                    Continue
                  </button>
                </div>
              )}

              {/* Input Area */}
              <div className="chat-input-area">
                <button className="chat-upload-btn" onClick={handleImageUpload} title="Upload image" aria-label="Upload image">
                  📷
                </button>
                <input
                  ref={inputRef}
                  className="chat-input"
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Type your message or paste an image..."
                  disabled={state === 'submitting'}
                />
                <button
                  className="chat-send-btn"
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || state === 'submitting'}
                  aria-label="Send message"
                >
                  ➤
                </button>
              </div>
            </>
          )}

          {/* Chat State without lead (greeting first) */}
          {state === 'greeting' && !leadId && (
            <>
              <MessageList messages={messages} isTyping={false} />
              {quickReplies.length > 0 && (
                <div className="chat-quick-replies">
                  {quickReplies.map(reply => (
                    <button key={reply} className="chat-quick-reply-btn" onClick={() => {
                      if (reply === 'Upload a photo' || reply === 'Find a product' || reply === 'Request quotation' || reply === 'Book showroom visit') {
                        setState('lead_gate')
                      } else {
                        handleQuickReply(reply)
                      }
                    }}>
                      {reply}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Appointment Picker */}
          {state === 'appointment' && leadId && (
            <AppointmentPicker
              leadId={leadId}
              conversationId={conversationId || ''}
              onSuccess={handleAppointmentSuccess}
              onError={handleAppointmentError}
              onCancel={handleAppointmentCancel}
            />
          )}

          {/* Viber Handoff */}
          {state === 'viber_handoff' && (
            <div style={{ padding: 16, flexShrink: 0 }}>
              <ViberHandoff
                viberNumber={widgetConfig.viberNumber}
                viberName={widgetConfig.viberName}
                onSendRFQ={handleSendRFQToSales}
                onClose={handleViberClose}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: '8px 16px', background: '#fff4f2', color: '#d93025', fontSize: 13, textAlign: 'center' }}>
              {error}
              <button onClick={() => setError('')} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
            </div>
          )}
        </div>
      )}

      {/* RFQ Cart Drawer (global overlay) */}
      <RFQCartDrawer isOpen={rfqDrawerOpen} onClose={() => setRfqDrawerOpen(false)} />
    </>
  )
}
