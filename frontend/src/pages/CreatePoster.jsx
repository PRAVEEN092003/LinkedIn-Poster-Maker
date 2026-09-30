import { useEffect, useRef, useState, useCallback } from 'react'
import { Canvas, Textbox, Rect, Circle, Line, FabricImage } from 'fabric'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Alert from '../components/Alert'
import { createPosterApi, updatePosterApi, listPostersApi, getPosterApi } from '../api/posters'

const CANVAS_SIZE = 1000

const PRESET_BG_COLORS = [
  { label: 'Deep Dark', value: '#09090b' },
  { label: 'Slate Dark', value: '#0f172a' },
  { label: 'Midnight Violet', value: '#1e1b4b' },
  { label: 'Zinc Dark', value: '#18181b' },
  { label: 'Forest Dark', value: '#064e3b' },
  { label: 'Charcoal', value: '#1c1917' },
]

const PRESET_TEXT_COLORS = [
  '#ffffff',
  '#e2e8f0',
  '#94a3b8',
  '#a78bfa',
  '#818cf8',
  '#38bdf8',
  '#fbbf24',
  '#f87171',
]

export default function CreatePoster() {
  const { navigateTo, getNavigationState, clearNavigationState } = useAuth()
  const canvasElRef = useRef(null)
  const imageInputRef = useRef(null)
  const logoInputRef = useRef(null)
  const fabricCanvasRef = useRef(null)

  // Active UI state
  const [activeTab, setActiveTab] = useState('templates') // 'templates' | 'elements' | 'saved'
  const [activeObject, setActiveObject] = useState(null)
  const [bgColor, setBgColor] = useState('#09090b')
  const [posterTitle, setPosterTitle] = useState('My LinkedIn Poster')
  const [currentTemplate, setCurrentTemplate] = useState('custom')
  const [editingPosterId, setEditingPosterId] = useState(null)

  // Feedback states
  const [notification, setNotification] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [savedPosters, setSavedPosters] = useState([])
  const [isLoadingSaved, setIsLoadingSaved] = useState(false)

  // Text properties for selected object
  const [textProps, setTextProps] = useState({
    text: '',
    fontSize: 32,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    fill: '#ffffff',
  })

  // Undo / Redo history stack
  const historyRef = useRef([])
  const historyIndexRef = useRef(-1)
  const isHistoryActionRef = useRef(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const updateHistoryControls = () => {
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }

  const saveHistory = useCallback(() => {
    if (isHistoryActionRef.current) return
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const json = JSON.stringify(canvas.toJSON())
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1)
    nextHistory.push(json)

    if (nextHistory.length > 30) {
      nextHistory.shift()
    }

    historyRef.current = nextHistory
    historyIndexRef.current = nextHistory.length - 1
    updateHistoryControls()
  }, [])

  const handleUndo = async () => {
    const canvas = fabricCanvasRef.current
    if (!canvas || historyIndexRef.current <= 0) return

    isHistoryActionRef.current = true
    historyIndexRef.current -= 1
    const json = historyRef.current[historyIndexRef.current]

    await canvas.loadFromJSON(JSON.parse(json))
    canvas.renderAll()
    isHistoryActionRef.current = false
    updateHistoryControls()
  }

  const handleRedo = async () => {
    const canvas = fabricCanvasRef.current
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return

    isHistoryActionRef.current = true
    historyIndexRef.current += 1
    const json = historyRef.current[historyIndexRef.current]

    await canvas.loadFromJSON(JSON.parse(json))
    canvas.renderAll()
    isHistoryActionRef.current = false
    updateHistoryControls()
  }

  // ── Sync Active Object with State ──────────────────────────────────────────
  const syncActiveObject = useCallback((obj) => {
    if (!obj) {
      setActiveObject(null)
      return
    }

    setActiveObject(obj)

    if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
      setTextProps({
        text: obj.text || '',
        fontSize: obj.fontSize || 32,
        fontWeight: obj.fontWeight || 'normal',
        fontStyle: obj.fontStyle || 'normal',
        textAlign: obj.textAlign || 'left',
        fill: obj.fill || '#ffffff',
      })
    }
  }, [])

  // ── Fetch Saved Posters ────────────────────────────────────────────────────
  const loadSavedPostersList = useCallback(async () => {
    setIsLoadingSaved(true)
    setError('')
    try {
      const res = await listPostersApi()
      if (res.success && res.posters) {
        setSavedPosters(res.posters)
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load saved posters.'
      setError(msg)
    } finally {
      setIsLoadingSaved(false)
    }
  }, [])

  const lastAiDataRef = useRef(null)

  // ── Canvas Dimensions & Safe Margins ──────────────────────────────────────
  const CANVAS_W = 1000
  const CANVAS_H = 1000
  const SAFE_LEFT = 70
  const SAFE_RIGHT = 930
  const SAFE_TOP = 70
  const SAFE_BOTTOM = 930

  // ── Helper Utilities for Layout & Content ──────────────────────────────────
  const getTemplateForContentType = (contentType) => {
    if (!contentType) return 'professional'
    const normalized = String(contentType).toLowerCase().trim()
    if (normalized.includes('internship')) return 'internship'
    if (normalized.includes('achievement')) return 'achievement'
    if (normalized.includes('project')) return 'project'
    if (normalized.includes('certificate') || normalized.includes('certif')) return 'certificate'
    if (normalized.includes('job')) return 'job_update'
    if (normalized.includes('announcement') || normalized.includes('professional')) return 'professional'
    return 'professional'
  }

  const getCategoryLabel = (contentType, templateName) => {
    if (contentType) {
      const ct = String(contentType).toLowerCase().trim()
      if (ct.includes('internship')) return '★  INTERNSHIP MILESTONE  ★'
      if (ct.includes('achievement')) return '★  NEW ACHIEVEMENT UNLOCKED  ★'
      if (ct.includes('certificate')) return 'CERTIFICATE OF COMPLETION'
      if (ct.includes('project')) return 'PROJECT SPOTLIGHT'
      if (ct.includes('job')) return 'CAREER UPDATE'
      if (ct.includes('announcement')) return 'EXECUTIVE ANNOUNCEMENT'
      return String(contentType).toUpperCase()
    }
    if (templateName === 'internship') return 'INTERNSHIP MILESTONE'
    if (templateName === 'achievement') return 'MILESTONE ACHIEVED'
    if (templateName === 'project') return 'PROJECT SPOTLIGHT'
    if (templateName === 'certificate') return 'OFFICIAL CERTIFICATION'
    if (templateName === 'job_update') return 'CAREER UPDATE'
    return 'EXECUTIVE ANNOUNCEMENT'
  }

  const formatChipLabel = (str) => {
    if (!str) return ''
    let clean = String(str).replace(/^#/, '').trim()
    clean = clean.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    return clean.trim()
  }

  const formatSupportingText = (text, maxChars = 140) => {
    if (!text) return ''
    const trimmed = text.trim()
    if (trimmed.length <= maxChars) return trimmed
    const substr = trimmed.slice(0, maxChars)
    const lastSpace = substr.lastIndexOf(' ')
    return (lastSpace > 70 ? substr.slice(0, lastSpace) : substr).trim() + '...'
  }

  const extractKeywords = (aiData, fallback = ['Innovation', 'Technology', 'Impact']) => {
    const result = []
    if (aiData?.hashtags) {
      const list = Array.isArray(aiData.hashtags)
        ? aiData.hashtags
        : (typeof aiData.hashtags === 'string' ? aiData.hashtags.split(/\s+/) : [])
      for (const h of list) {
        const formatted = formatChipLabel(h)
        if (formatted && formatted.length >= 2 && !result.includes(formatted)) {
          result.push(formatted)
        }
      }
    }
    if (result.length >= 2) {
      return result.slice(0, 3)
    }
    const combined = `${aiData?.headline || ''} ${aiData?.poster_text || ''}`
    const words = combined.match(/\b[A-Z][a-zA-Z0-9.+]{2,}\b/g) || []
    for (const w of words) {
      const cleanW = formatChipLabel(w)
      if (cleanW && !result.includes(cleanW) && !['The', 'And', 'For', 'With', 'Our', 'New', 'This', 'From', 'Into', 'About', 'Full'].includes(cleanW)) {
        result.push(cleanW)
      }
    }
    for (const fb of fallback) {
      if (result.length < 3 && !result.includes(fb)) {
        result.push(fb)
      }
    }
    return result.slice(0, 3)
  }

  const getFooterHashtags = (aiData, defaultText = '#Professional   #Growth   #Leadership') => {
    if (aiData?.hashtags) {
      if (Array.isArray(aiData.hashtags) && aiData.hashtags.length > 0) {
        const tags = aiData.hashtags.map(t => t.startsWith('#') ? t : `#${t}`).slice(0, 4).join('   ')
        if (tags.trim()) return tags
      } else if (typeof aiData.hashtags === 'string' && aiData.hashtags.trim()) {
        return aiData.hashtags.split(/\s+/).map(t => t.startsWith('#') ? t : `#${t}`).join('   ')
      }
    }
    return defaultText
  }

  // ── Positioning & Origin Helpers ───────────────────────────────────────────
  const setLeftTop = (object, x, y) => {
    object.set({
      originX: 'left',
      originY: 'top',
      left: x,
      top: y,
    })
    object.setCoords()
  }

  const centerObjectX = (object) => {
    object.set({
      originX: 'left',
      originY: 'top',
    })
    object.setCoords()
    const width = object.getScaledWidth() || object.width || 0
    const left = Math.max(
      SAFE_LEFT,
      Math.min((CANVAS_W - width) / 2, SAFE_RIGHT - width)
    )
    object.set({ left })
    object.setCoords()
    return left
  }

  const fitTextToWidth = (textbox, maxWidth = 820, maxFontSize = 48, minFontSize = 20, maxHeight = null) => {
    textbox.set({
      originX: 'left',
      originY: 'top',
      width: maxWidth,
      fontSize: maxFontSize,
    })
    textbox.initDimensions?.()
    textbox.setCoords()

    let currentSize = maxFontSize
    if (maxHeight) {
      while (currentSize > minFontSize) {
        textbox.setCoords()
        const bounds = textbox.getBoundingRect()
        if (bounds.height <= maxHeight) break
        currentSize -= 2
        textbox.set({ fontSize: currentSize })
        textbox.initDimensions?.()
        textbox.setCoords()
      }
    }
    return currentSize
  }

  const addHorizontalChips = (canvas, tags, topY, maxRowWidth = 840, chipConfig = {}) => {
    if (!tags || tags.length === 0) return topY

    const {
      height = 46,
      rx = 23,
      fontSize = 17,
      primaryIndex = 0,
      primaryColor = '#c4b5fd',
      primaryBg = 'rgba(139, 92, 246, 0.18)',
      primaryBorder = 'rgba(167, 139, 250, 0.4)',
      defaultColor = '#e2e8f0',
      defaultBg = 'rgba(255, 255, 255, 0.07)',
      defaultBorder = 'rgba(255, 255, 255, 0.15)',
    } = chipConfig

    const chipWidths = tags.map((t) => Math.max(Math.min(t.length * 13 + 48, 300), 160))
    const gap = 18

    let currentRow = []
    let currentRowWidth = 0
    let currentTop = topY

    const rows = []

    tags.forEach((tag, idx) => {
      const w = chipWidths[idx]
      const needed = currentRow.length === 0 ? w : currentRowWidth + gap + w
      if (needed <= maxRowWidth) {
        currentRow.push({ tag, width: w, idx })
        currentRowWidth = needed
      } else {
        if (currentRow.length > 0) rows.push({ items: currentRow, width: currentRowWidth })
        currentRow = [{ tag, width: w, idx }]
        currentRowWidth = w
      }
    })
    if (currentRow.length > 0) {
      rows.push({ items: currentRow, width: currentRowWidth })
    }

    rows.forEach((row) => {
      let startX = Math.max(SAFE_LEFT, (CANVAS_W - row.width) / 2)
      row.items.forEach((item) => {
        const isPrimary = item.idx === primaryIndex
        const chipBg = new Rect({
          originX: 'left',
          originY: 'top',
          left: startX,
          top: currentTop,
          width: item.width,
          height: height,
          rx: rx,
          ry: rx,
          fill: isPrimary ? primaryBg : defaultBg,
          stroke: isPrimary ? primaryBorder : defaultBorder,
          strokeWidth: 1.5,
          selectable: true,
        })
        const chipTxt = new Textbox(item.tag, {
          originX: 'left',
          originY: 'top',
          left: startX + 10,
          top: currentTop + (height - fontSize - 6) / 2,
          width: item.width - 20,
          fontSize: fontSize,
          fontWeight: 'bold',
          fill: isPrimary ? primaryColor : defaultColor,
          textAlign: 'center',
          selectable: true,
        })
        canvas.add(chipBg)
        canvas.add(chipTxt)
        startX += item.width + gap
      })
      currentTop += height + 14
    })

    return currentTop
  }

  const validatePosterLayout = (canvas) => {
    if (!canvas) return
    const objects = canvas.getObjects()
    objects.forEach((object) => {
      if (object.isBackground) return

      if (!object.originX || object.originX !== 'left') {
        object.set({ originX: 'left' })
      }
      if (!object.originY || object.originY !== 'top') {
        object.set({ originY: 'top' })
      }
      object.setCoords()
      const bounds = object.getBoundingRect()

      let dx = 0
      let dy = 0

      if (bounds.left < SAFE_LEFT) {
        dx = SAFE_LEFT - bounds.left
      } else if (bounds.left + bounds.width > SAFE_RIGHT) {
        dx = SAFE_RIGHT - (bounds.left + bounds.width)
      }

      if (bounds.top < SAFE_TOP) {
        dy = SAFE_TOP - bounds.top
      } else if (bounds.top + bounds.height > SAFE_BOTTOM) {
        dy = SAFE_BOTTOM - (bounds.top + bounds.height)
      }

      if (dx !== 0 || dy !== 0) {
        object.set({
          left: object.left + dx,
          top: object.top + dy,
        })
        object.setCoords()
      }
    })
    canvas.renderAll()
  }

  // ── 1. Internship Poster Generator ─────────────────────────────────────────
  const generateInternshipPoster = (canvas, aiData) => {
    canvas.backgroundColor = '#070b16'
    setBgColor('#070b16')

    // Layered background atmosphere
    const glowCircle1 = new Circle({
      originX: 'left',
      originY: 'top',
      left: 620,
      top: 40,
      radius: 220,
      fill: 'rgba(124, 58, 237, 0.12)',
      stroke: 'rgba(139, 92, 246, 0.2)',
      strokeWidth: 1.5,
      selectable: true,
      isBackground: true,
    })
    canvas.add(glowCircle1)

    const glowCircle2 = new Circle({
      originX: 'left',
      originY: 'top',
      left: 40,
      top: 660,
      radius: 180,
      fill: 'rgba(99, 102, 241, 0.08)',
      stroke: 'rgba(99, 102, 241, 0.15)',
      strokeWidth: 1.5,
      selectable: true,
      isBackground: true,
    })
    canvas.add(glowCircle2)

    // Outer frame card
    const outerCard = new Rect({
      originX: 'left',
      originY: 'top',
      left: 50,
      top: 50,
      width: 900,
      height: 900,
      rx: 24,
      ry: 24,
      fill: 'rgba(15, 23, 42, 0.65)',
      stroke: 'rgba(139, 92, 246, 0.25)',
      strokeWidth: 2,
      selectable: true,
      isBackground: true,
    })
    canvas.add(outerCard)

    // TOP 15%: Category Header Pill & Line Accent
    const badgePill = new Rect({
      originX: 'left',
      originY: 'top',
      left: 310,
      top: 80,
      width: 380,
      height: 44,
      rx: 22,
      ry: 22,
      fill: 'rgba(139, 92, 246, 0.18)',
      stroke: 'rgba(167, 139, 250, 0.45)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(badgePill)
    centerObjectX(badgePill)

    const badgeText = new Textbox('✦  INTERNSHIP MILESTONE  ✦', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 92,
      width: 820,
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#c4b5fd',
      charSpacing: 100,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(badgeText)
    centerObjectX(badgeText)

    // MIDDLE 45%: Hero Headline
    const headlineRaw = aiData?.headline?.trim() || 'Successfully Completed My Software Engineering Internship at Wiltech Solutions'
    const headline = new Textbox(headlineRaw, {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 155,
      width: 820,
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#ffffff',
      lineHeight: 1.25,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(headline)
    fitTextToWidth(headline, 820, 48, 32)
    centerObjectX(headline)
    const headlineBounds = headline.getBoundingRect()
    const headlineBottom = headline.top + (headlineBounds.height || 85)

    // Accent line below headline
    const centerLine = new Line([380, headlineBottom + 16, 620, headlineBottom + 16], {
      originX: 'left',
      originY: 'top',
      left: 380,
      top: headlineBottom + 16,
      stroke: 'rgba(167, 139, 250, 0.5)',
      strokeWidth: 2,
      selectable: true,
    })
    canvas.add(centerLine)
    centerObjectX(centerLine)

    // LOWER 30%: Supporting Content Card & Dynamic Keywords
    const rawQuote = aiData?.poster_text?.trim() || 'Contributed to high-impact production features, collaborated with engineering mentors, and mastered modern full-stack workflows.'
    const quoteFormatted = formatSupportingText(rawQuote, 140)
    const quoteTextFinal = quoteFormatted.startsWith('"') ? quoteFormatted : `"${quoteFormatted}"`

    const cardTop = Math.min(headlineBottom + 36, 460)
    const quoteBox = new Textbox(quoteTextFinal, {
      originX: 'left',
      originY: 'top',
      left: 120,
      top: cardTop + 40,
      width: 760,
      fontSize: 23,
      fontStyle: 'italic',
      fill: '#e2e8f0',
      lineHeight: 1.4,
      textAlign: 'center',
      selectable: true,
    })
    fitTextToWidth(quoteBox, 760, 23, 19, 140)
    const quoteBounds = quoteBox.getBoundingRect()
    const cardHeight = Math.max(quoteBounds.height + 64, 140)

    const quoteCard = new Rect({
      originX: 'left',
      originY: 'top',
      left: 90,
      top: cardTop,
      width: 820,
      height: cardHeight,
      rx: 18,
      ry: 18,
      fill: 'rgba(30, 27, 75, 0.6)',
      stroke: 'rgba(167, 139, 250, 0.3)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(quoteCard)
    centerObjectX(quoteCard)

    const cardLabel = new Textbox('KEY CONTRIBUTIONS & EXPERIENCE', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: cardTop + 14,
      width: 820,
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#a78bfa',
      charSpacing: 90,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(cardLabel)
    centerObjectX(cardLabel)

    canvas.add(quoteBox)
    centerObjectX(quoteBox)
    const cardBottom = cardTop + cardHeight

    // 3 Clean Keyword Chips
    const tags = extractKeywords(aiData, ['Software Engineering', 'Wiltech Solutions', 'Career Growth'])
    const chipNextY = addHorizontalChips(canvas, tags, Math.min(cardBottom + 26, 680), 840, {
      height: 46,
      rx: 23,
      fontSize: 17,
      primaryIndex: 0,
      primaryColor: '#c4b5fd',
      primaryBg: 'rgba(139, 92, 246, 0.2)',
      primaryBorder: 'rgba(167, 139, 250, 0.45)',
    })

    // Milestone Progress Flow Indicator
    const progressText = new Textbox('01 LEARNING   →   02 DELIVERING   →   03 SCALING IMPACT', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: Math.min(chipNextY + 12, 785),
      width: 820,
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#818cf8',
      charSpacing: 80,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(progressText)
    centerObjectX(progressText)

    // BOTTOM 10%: Divider, Hashtags & Subtle Branding
    const divider = new Line([90, 835, 910, 835], {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 835,
      stroke: 'rgba(139, 92, 246, 0.3)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(divider)

    const footerTags = new Textbox(getFooterHashtags(aiData, '#Internship   #Engineering   #CareerMilestone'), {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 852,
      width: 820,
      fontSize: 16,
      fontWeight: '500',
      fill: '#a78bfa',
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(footerTags)
    fitTextToWidth(footerTags, 820, 16, 14)
    centerObjectX(footerTags)

    const brandFooter = new Textbox('Designed with PostCraft', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 884,
      width: 820,
      fontSize: 13,
      fill: '#64748b',
      charSpacing: 60,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(brandFooter)
    centerObjectX(brandFooter)
  }

  // ── 2. Achievement Poster Generator ────────────────────────────────────────
  const generateAchievementPoster = (canvas, aiData) => {
    canvas.backgroundColor = '#08080a'
    setBgColor('#08080a')

    // Layered background atmosphere
    const aura = new Circle({
      originX: 'left',
      originY: 'top',
      left: 360,
      top: 30,
      radius: 140,
      fill: 'rgba(245, 158, 11, 0.1)',
      stroke: 'rgba(245, 158, 11, 0.25)',
      strokeWidth: 1.5,
      selectable: true,
      isBackground: true,
    })
    canvas.add(aura)

    // Elegant gold corner brackets
    const cornerLines = [
      new Line([70, 70, 150, 70], { originX: 'left', originY: 'top', left: 70, top: 70, stroke: '#fbbf24', strokeWidth: 2.5, selectable: true }),
      new Line([70, 70, 70, 150], { originX: 'left', originY: 'top', left: 70, top: 70, stroke: '#fbbf24', strokeWidth: 2.5, selectable: true }),
      new Line([850, 70, 930, 70], { originX: 'left', originY: 'top', left: 850, top: 70, stroke: '#fbbf24', strokeWidth: 2.5, selectable: true }),
      new Line([930, 70, 930, 150], { originX: 'left', originY: 'top', left: 930, top: 70, stroke: '#fbbf24', strokeWidth: 2.5, selectable: true }),
    ]
    cornerLines.forEach(l => canvas.add(l))

    // Main frame card
    const outerCard = new Rect({
      originX: 'left',
      originY: 'top',
      left: 50,
      top: 50,
      width: 900,
      height: 900,
      rx: 24,
      ry: 24,
      fill: 'rgba(24, 24, 27, 0.65)',
      stroke: 'rgba(251, 191, 36, 0.3)',
      strokeWidth: 2,
      selectable: true,
      isBackground: true,
    })
    canvas.add(outerCard)

    // TOP 15%: Milestone Header Pill
    const badgePill = new Rect({
      originX: 'left',
      originY: 'top',
      left: 310,
      top: 80,
      width: 380,
      height: 44,
      rx: 22,
      ry: 22,
      fill: 'rgba(251, 191, 36, 0.15)',
      stroke: 'rgba(251, 191, 36, 0.45)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(badgePill)
    centerObjectX(badgePill)

    const badgeText = new Textbox('✦  MILESTONE ACHIEVED  ✦', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 92,
      width: 820,
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#fbbf24',
      charSpacing: 110,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(badgeText)
    centerObjectX(badgeText)

    // MIDDLE 45%: Hero Headline
    const headlineRaw = aiData?.headline?.trim() || 'Certified Solutions Architect & Team Excellence Recognition'
    const headline = new Textbox(headlineRaw, {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 155,
      width: 820,
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#ffffff',
      lineHeight: 1.25,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(headline)
    fitTextToWidth(headline, 820, 48, 32)
    centerObjectX(headline)
    const headlineBounds = headline.getBoundingRect()
    const headlineBottom = headline.top + (headlineBounds.height || 85)

    // Gold accent divider line
    const centerLine = new Line([380, headlineBottom + 16, 620, headlineBottom + 16], {
      originX: 'left',
      originY: 'top',
      left: 380,
      top: headlineBottom + 16,
      stroke: 'rgba(251, 191, 36, 0.6)',
      strokeWidth: 2,
      selectable: true,
    })
    canvas.add(centerLine)
    centerObjectX(centerLine)

    // LOWER 30%: Supporting Content Card & Dynamic Keywords
    const rawDesc = aiData?.poster_text?.trim() || 'Grateful for the guidance of mentors and team collaboration. Dedicated to continuous learning, building robust systems, and delivering measurable impact.'
    const descFormatted = formatSupportingText(rawDesc, 140)
    const cardTop = Math.min(headlineBottom + 36, 460)

    const descBox = new Textbox(descFormatted, {
      originX: 'left',
      originY: 'top',
      left: 120,
      top: cardTop + 40,
      width: 760,
      fontSize: 23,
      fill: '#f4f4f5',
      lineHeight: 1.4,
      textAlign: 'center',
      selectable: true,
    })
    fitTextToWidth(descBox, 760, 23, 19, 140)
    const descBounds = descBox.getBoundingRect()
    const cardHeight = Math.max(descBounds.height + 64, 140)

    const descCard = new Rect({
      originX: 'left',
      originY: 'top',
      left: 90,
      top: cardTop,
      width: 820,
      height: cardHeight,
      rx: 18,
      ry: 18,
      fill: 'rgba(39, 39, 42, 0.7)',
      stroke: 'rgba(251, 191, 36, 0.3)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(descCard)
    centerObjectX(descCard)

    const cardLabel = new Textbox('IMPACT & RECOGNITION HIGHLIGHTS', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: cardTop + 14,
      width: 820,
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#fbbf24',
      charSpacing: 90,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(cardLabel)
    centerObjectX(cardLabel)

    canvas.add(descBox)
    centerObjectX(descBox)
    const cardBottom = cardTop + cardHeight

    // 3 Clean Keyword Chips
    const badges = extractKeywords(aiData, ['Excellence', 'Innovation', 'Leadership'])
    const chipNextY = addHorizontalChips(canvas, badges, Math.min(cardBottom + 26, 680), 840, {
      height: 46,
      rx: 23,
      fontSize: 17,
      primaryIndex: 0,
      primaryColor: '#fef08a',
      primaryBg: 'rgba(251, 191, 36, 0.18)',
      primaryBorder: 'rgba(251, 191, 36, 0.45)',
      defaultColor: '#fef08a',
      defaultBg: 'rgba(251, 191, 36, 0.1)',
      defaultBorder: 'rgba(251, 191, 36, 0.25)',
    })

    // Core Values Sub-Bar
    const valuesText = new Textbox('✦ DEDICATION   ✦ TECHNICAL MASTERY   ✦ SCALE', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: Math.min(chipNextY + 12, 785),
      width: 820,
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#fde047',
      charSpacing: 80,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(valuesText)
    centerObjectX(valuesText)

    // BOTTOM 10%: Divider, Hashtags & Subtle Branding
    const divider = new Line([90, 835, 910, 835], {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 835,
      stroke: 'rgba(251, 191, 36, 0.3)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(divider)

    const footerTags = new Textbox(getFooterHashtags(aiData, '#Achievement   #Milestone   #Excellence'), {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 852,
      width: 820,
      fontSize: 16,
      fontWeight: '500',
      fill: '#fbbf24',
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(footerTags)
    fitTextToWidth(footerTags, 820, 16, 14)
    centerObjectX(footerTags)

    const brandFooter = new Textbox('Designed with PostCraft', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 884,
      width: 820,
      fontSize: 13,
      fill: '#71717a',
      charSpacing: 60,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(brandFooter)
    centerObjectX(brandFooter)
  }

  // ── 3. Project Showcase Poster Generator ───────────────────────────────────
  const generateProjectPoster = (canvas, aiData) => {
    canvas.backgroundColor = '#070c17'
    setBgColor('#070c17')

    // Tech geometric backdrop
    const techCircle = new Circle({
      originX: 'left',
      originY: 'top',
      left: 660,
      top: 50,
      radius: 200,
      fill: 'rgba(56, 189, 248, 0.08)',
      stroke: 'rgba(56, 189, 248, 0.2)',
      strokeWidth: 1.5,
      selectable: true,
      isBackground: true,
    })
    canvas.add(techCircle)

    // Main frame card
    const outerCard = new Rect({
      originX: 'left',
      originY: 'top',
      left: 50,
      top: 50,
      width: 900,
      height: 900,
      rx: 24,
      ry: 24,
      fill: 'rgba(15, 23, 42, 0.65)',
      stroke: 'rgba(56, 189, 248, 0.25)',
      strokeWidth: 2,
      selectable: true,
      isBackground: true,
    })
    canvas.add(outerCard)

    // TOP 15%: Project Spotlight Pill & Status Badge
    const pillBg = new Rect({
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 82,
      width: 260,
      height: 42,
      rx: 10,
      ry: 10,
      fill: 'rgba(56, 189, 248, 0.16)',
      stroke: 'rgba(56, 189, 248, 0.45)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(pillBg)

    const pillTxt = new Textbox('PROJECT SPOTLIGHT', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 93,
      width: 260,
      fontSize: 15,
      fontWeight: 'bold',
      fill: '#38bdf8',
      charSpacing: 80,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(pillTxt)

    const statusBadge = new Textbox('● LIVE DEPLOYMENT', {
      originX: 'left',
      originY: 'top',
      left: 670,
      top: 93,
      width: 240,
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#34d399',
      charSpacing: 60,
      textAlign: 'right',
      selectable: true,
    })
    canvas.add(statusBadge)

    const topTechLine = new Line([370, 103, 650, 103], {
      originX: 'left',
      originY: 'top',
      left: 370,
      top: 103,
      stroke: 'rgba(56, 189, 248, 0.3)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(topTechLine)

    // MIDDLE 45%: Hero Project Title
    const headlineRaw = aiData?.headline?.trim() || 'AI Powered LinkedIn Poster Maker Copilot'
    const headline = new Textbox(headlineRaw, {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 155,
      width: 820,
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#ffffff',
      lineHeight: 1.25,
      textAlign: 'left',
      selectable: true,
    })
    canvas.add(headline)
    fitTextToWidth(headline, 820, 48, 32)
    const headlineBounds = headline.getBoundingRect()
    const headlineBottom = headline.top + (headlineBounds.height || 85)

    // LOWER 30%: Terminal Architecture Card & Stack Chips
    const rawDesc = aiData?.poster_text?.trim() || 'Architected and built full-stack microservices with optimized sub-millisecond response times, AI integration, and high-resolution visual generation.'
    const descFormatted = formatSupportingText(rawDesc, 140)
    const cardTop = Math.min(headlineBottom + 32, 460)

    const descBox = new Textbox(descFormatted, {
      originX: 'left',
      originY: 'top',
      left: 120,
      top: cardTop + 48,
      width: 760,
      fontSize: 23,
      fill: '#cbd5e1',
      lineHeight: 1.4,
      textAlign: 'left',
      selectable: true,
    })
    fitTextToWidth(descBox, 760, 23, 19, 140)
    const descBounds = descBox.getBoundingRect()
    const cardHeight = Math.max(descBounds.height + 70, 145)

    const descCard = new Rect({
      originX: 'left',
      originY: 'top',
      left: 90,
      top: cardTop,
      width: 820,
      height: cardHeight,
      rx: 16,
      ry: 16,
      fill: 'rgba(2, 6, 23, 0.75)',
      stroke: 'rgba(56, 189, 248, 0.3)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(descCard)

    // Terminal dots simulation
    const dot1 = new Circle({ originX: 'left', originY: 'top', left: 115, top: cardTop + 18, radius: 5, fill: '#ef4444', selectable: true })
    const dot2 = new Circle({ originX: 'left', originY: 'top', left: 130, top: cardTop + 18, radius: 5, fill: '#f59e0b', selectable: true })
    const dot3 = new Circle({ originX: 'left', originY: 'top', left: 145, top: cardTop + 18, radius: 5, fill: '#10b981', selectable: true })
    canvas.add(dot1)
    canvas.add(dot2)
    canvas.add(dot3)

    const termHeader = new Textbox('SYSTEM ARCHITECTURE & CAPABILITIES', {
      originX: 'left',
      originY: 'top',
      left: 170,
      top: cardTop + 13,
      width: 700,
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#38bdf8',
      charSpacing: 70,
      textAlign: 'left',
      selectable: true,
    })
    canvas.add(termHeader)

    canvas.add(descBox)
    const cardBottom = cardTop + cardHeight

    // 3 Clean Tech Stack Chips
    const techTags = extractKeywords(aiData, ['Full Stack', 'Cloud Architecture', 'AI Engineering'])
    const chipNextY = addHorizontalChips(canvas, techTags, Math.min(cardBottom + 26, 680), 840, {
      height: 46,
      rx: 12,
      fontSize: 17,
      primaryIndex: 0,
      primaryColor: '#38bdf8',
      primaryBg: 'rgba(56, 189, 248, 0.18)',
      primaryBorder: 'rgba(56, 189, 248, 0.45)',
    })

    // Architecture highlights
    const archText = new Textbox('PRODUCTION READY   •   SCALABLE ARCHITECTURE   •   OPEN COLLABORATION', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: Math.min(chipNextY + 12, 785),
      width: 820,
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#67e8f9',
      charSpacing: 70,
      textAlign: 'left',
      selectable: true,
    })
    canvas.add(archText)

    // BOTTOM 10%: Divider, Hashtags & Subtle Branding
    const divider = new Line([90, 835, 910, 835], {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 835,
      stroke: 'rgba(56, 189, 248, 0.3)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(divider)

    const footerTags = new Textbox(getFooterHashtags(aiData, '#OpenSource   #SoftwareEngineering   #TechInnovation'), {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 852,
      width: 820,
      fontSize: 16,
      fontWeight: '500',
      fill: '#38bdf8',
      textAlign: 'left',
      selectable: true,
    })
    canvas.add(footerTags)
    fitTextToWidth(footerTags, 820, 16, 14)

    const brandFooter = new Textbox('Designed with PostCraft', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 884,
      width: 820,
      fontSize: 13,
      fill: '#64748b',
      charSpacing: 60,
      textAlign: 'left',
      selectable: true,
    })
    canvas.add(brandFooter)
  }

  // ── 4. Certificate Poster Generator ────────────────────────────────────────
  const generateCertificatePoster = (canvas, aiData) => {
    canvas.backgroundColor = '#022119'
    setBgColor('#022119')

    // Double security/credential border
    const outerBorder = new Rect({
      originX: 'left',
      originY: 'top',
      left: 50,
      top: 50,
      width: 900,
      height: 900,
      rx: 20,
      ry: 20,
      fill: 'transparent',
      stroke: 'rgba(52, 211, 153, 0.4)',
      strokeWidth: 2,
      selectable: true,
      isBackground: true,
    })
    canvas.add(outerBorder)

    const innerBorder = new Rect({
      originX: 'left',
      originY: 'top',
      left: 64,
      top: 64,
      width: 872,
      height: 872,
      rx: 14,
      ry: 14,
      fill: 'rgba(6, 78, 59, 0.25)',
      stroke: 'rgba(52, 211, 153, 0.18)',
      strokeWidth: 1.5,
      selectable: true,
      isBackground: true,
    })
    canvas.add(innerBorder)

    // TOP 15%: Official Credential Header & Diamond Divider
    const certTag = new Textbox('OFFICIAL CERTIFICATION & CREDENTIAL', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 86,
      width: 820,
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#6ee7b7',
      charSpacing: 110,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(certTag)
    centerObjectX(certTag)

    const diamondDivider = new Textbox('——   ✦   ——', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 110,
      width: 820,
      fontSize: 14,
      fill: 'rgba(52, 211, 153, 0.6)',
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(diamondDivider)
    centerObjectX(diamondDivider)

    // MIDDLE 45%: Hero Title
    const headlineRaw = aiData?.headline?.trim() || 'Certified Full Stack Web Development Professional'
    const headline = new Textbox(headlineRaw, {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 160,
      width: 820,
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#ffffff',
      lineHeight: 1.25,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(headline)
    fitTextToWidth(headline, 820, 48, 32)
    centerObjectX(headline)
    const headlineBounds = headline.getBoundingRect()
    const headlineBottom = headline.top + (headlineBounds.height || 85)

    // Mint accent divider line
    const centerLine = new Line([380, headlineBottom + 16, 620, headlineBottom + 16], {
      originX: 'left',
      originY: 'top',
      left: 380,
      top: headlineBottom + 16,
      stroke: 'rgba(52, 211, 153, 0.5)',
      strokeWidth: 2,
      selectable: true,
    })
    canvas.add(centerLine)
    centerObjectX(centerLine)

    // LOWER 30%: Credential Summary Card & Verification Seal
    const rawDesc = aiData?.poster_text?.trim() || 'Successfully completed comprehensive curriculum, validating hands-on expertise in modern web technologies and full-stack software development.'
    const descFormatted = formatSupportingText(rawDesc, 140)
    const cardTop = Math.min(headlineBottom + 36, 460)

    const descBox = new Textbox(descFormatted, {
      originX: 'left',
      originY: 'top',
      left: 120,
      top: cardTop + 40,
      width: 760,
      fontSize: 23,
      fill: '#d1fae5',
      lineHeight: 1.4,
      textAlign: 'center',
      selectable: true,
    })
    fitTextToWidth(descBox, 760, 23, 19, 140)
    const descBounds = descBox.getBoundingRect()
    const cardHeight = Math.max(descBounds.height + 64, 140)

    const descCard = new Rect({
      originX: 'left',
      originY: 'top',
      left: 90,
      top: cardTop,
      width: 820,
      height: cardHeight,
      rx: 16,
      ry: 16,
      fill: 'rgba(4, 47, 46, 0.7)',
      stroke: 'rgba(52, 211, 153, 0.3)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(descCard)
    centerObjectX(descCard)

    const cardLabel = new Textbox('DOMAIN MASTERY & VALIDATION', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: cardTop + 14,
      width: 820,
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#34d399',
      charSpacing: 90,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(cardLabel)
    centerObjectX(cardLabel)

    canvas.add(descBox)
    centerObjectX(descBox)
    const cardBottom = cardTop + cardHeight

    // 3 Verified Credential Chips
    const certBadges = extractKeywords(aiData, ['Verified Skill', 'Domain Mastery', 'Lifelong Learning'])
    const chipNextY = addHorizontalChips(canvas, certBadges, Math.min(cardBottom + 26, 680), 840, {
      height: 46,
      rx: 12,
      fontSize: 17,
      primaryIndex: 0,
      primaryColor: '#a7f3d0',
      primaryBg: 'rgba(16, 185, 129, 0.2)',
      primaryBorder: 'rgba(52, 211, 153, 0.45)',
      defaultColor: '#a7f3d0',
      defaultBg: 'rgba(16, 185, 129, 0.1)',
      defaultBorder: 'rgba(52, 211, 153, 0.25)',
    })

    // Verification Seal Indicator
    const sealText = new Textbox('✦ VERIFIED CREDENTIAL   •   STANDARDS COMPLIANT   •   CERTIFIED ✦', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: Math.min(chipNextY + 12, 785),
      width: 820,
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#6ee7b7',
      charSpacing: 80,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(sealText)
    centerObjectX(sealText)

    // BOTTOM 10%: Divider, Hashtags & Subtle Branding
    const divider = new Line([90, 835, 910, 835], {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 835,
      stroke: 'rgba(52, 211, 153, 0.3)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(divider)

    const footerTags = new Textbox(getFooterHashtags(aiData, '#Certified   #SkillUp   #ContinuousLearning'), {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 852,
      width: 820,
      fontSize: 16,
      fontWeight: '500',
      fill: '#6ee7b7',
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(footerTags)
    fitTextToWidth(footerTags, 820, 16, 14)
    centerObjectX(footerTags)

    const brandFooter = new Textbox('Designed with PostCraft', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 884,
      width: 820,
      fontSize: 13,
      fill: '#059669',
      charSpacing: 60,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(brandFooter)
    centerObjectX(brandFooter)
  }

  // ── 5. Job Update Poster Generator ─────────────────────────────────────────
  const generateJobUpdatePoster = (canvas, aiData) => {
    canvas.backgroundColor = '#0b1120'
    setBgColor('#0b1120')

    // Background atmosphere
    const cornerBox = new Rect({
      originX: 'left',
      originY: 'top',
      left: 60,
      top: 60,
      width: 160,
      height: 160,
      rx: 32,
      ry: 32,
      fill: 'rgba(99, 102, 241, 0.08)',
      stroke: 'rgba(99, 102, 241, 0.18)',
      strokeWidth: 1.5,
      selectable: true,
      isBackground: true,
    })
    canvas.add(cornerBox)

    const circleGlow = new Circle({
      originX: 'left',
      originY: 'top',
      left: 680,
      top: 640,
      radius: 160,
      fill: 'rgba(129, 140, 248, 0.08)',
      stroke: 'rgba(129, 140, 248, 0.2)',
      strokeWidth: 1.5,
      selectable: true,
      isBackground: true,
    })
    canvas.add(circleGlow)

    // Main frame card
    const outerCard = new Rect({
      originX: 'left',
      originY: 'top',
      left: 50,
      top: 50,
      width: 900,
      height: 900,
      rx: 24,
      ry: 24,
      fill: 'rgba(15, 23, 42, 0.65)',
      stroke: 'rgba(129, 140, 248, 0.25)',
      strokeWidth: 2,
      selectable: true,
      isBackground: true,
    })
    canvas.add(outerCard)

    // TOP 15%: Announcement Pill
    const tagPill = new Rect({
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 82,
      width: 260,
      height: 42,
      rx: 21,
      ry: 21,
      fill: 'rgba(99, 102, 241, 0.18)',
      stroke: 'rgba(129, 140, 248, 0.45)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(tagPill)

    const tagTxt = new Textbox('CAREER ANNOUNCEMENT', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 93,
      width: 260,
      fontSize: 15,
      fontWeight: 'bold',
      fill: '#a5b4fc',
      charSpacing: 80,
      textAlign: 'center',
      selectable: true,
    })
    canvas.add(tagTxt)

    const topLine = new Line([370, 103, 910, 103], {
      originX: 'left',
      originY: 'top',
      left: 370,
      top: 103,
      stroke: 'rgba(129, 140, 248, 0.25)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(topLine)

    // MIDDLE 45%: Hero Headline
    const headlineRaw = aiData?.headline?.trim() || 'Starting a New Chapter as Lead Software Engineer'
    const headline = new Textbox(headlineRaw, {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 155,
      width: 820,
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#ffffff',
      lineHeight: 1.25,
      textAlign: 'left',
      selectable: true,
    })
    canvas.add(headline)
    fitTextToWidth(headline, 820, 48, 32)
    const headlineBounds = headline.getBoundingRect()
    const headlineBottom = headline.top + (headlineBounds.height || 85)

    // LOWER 30%: Career Highlights Card
    const rawDesc = aiData?.poster_text?.trim() || 'Excited to drive technical vision, build scalable architectures, and partner with world-class product and engineering teams on high-impact initiatives.'
    const descFormatted = formatSupportingText(rawDesc, 140)
    const cardTop = Math.min(headlineBottom + 32, 460)

    const descBox = new Textbox(descFormatted, {
      originX: 'left',
      originY: 'top',
      left: 120,
      top: cardTop + 40,
      width: 760,
      fontSize: 23,
      fill: '#e0e7ff',
      lineHeight: 1.4,
      textAlign: 'left',
      selectable: true,
    })
    fitTextToWidth(descBox, 760, 23, 19, 140)
    const descBounds = descBox.getBoundingRect()
    const cardHeight = Math.max(descBounds.height + 64, 140)

    const descCard = new Rect({
      originX: 'left',
      originY: 'top',
      left: 90,
      top: cardTop,
      width: 820,
      height: cardHeight,
      rx: 18,
      ry: 18,
      fill: 'rgba(30, 27, 75, 0.65)',
      stroke: 'rgba(129, 140, 248, 0.3)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(descCard)

    const cardLabel = new Textbox('CAREER TRANSITION & FUTURE OUTLOOK', {
      originX: 'left',
      originY: 'top',
      left: 120,
      top: cardTop + 14,
      width: 760,
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#a5b4fc',
      charSpacing: 80,
      textAlign: 'left',
      selectable: true,
    })
    canvas.add(cardLabel)

    canvas.add(descBox)
    const cardBottom = cardTop + cardHeight

    // 3 Focus Badges
    const focusBadges = extractKeywords(aiData, ['New Chapter', 'Industry Leadership', 'Strategic Growth'])
    const chipNextY = addHorizontalChips(canvas, focusBadges, Math.min(cardBottom + 26, 680), 840, {
      height: 46,
      rx: 23,
      fontSize: 17,
      primaryIndex: 0,
      primaryColor: '#a5b4fc',
      primaryBg: 'rgba(99, 102, 241, 0.2)',
      primaryBorder: 'rgba(129, 140, 248, 0.45)',
    })

    // Transition Flow Marker
    const flowText = new Textbox('FOUNDATION BUILT   →   NEW HORIZON   →   FUTURE IMPACT', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: Math.min(chipNextY + 12, 785),
      width: 820,
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#818cf8',
      charSpacing: 80,
      textAlign: 'left',
      selectable: true,
    })
    canvas.add(flowText)

    // BOTTOM 10%: Divider, Hashtags & Subtle Branding
    const divider = new Line([90, 835, 910, 835], {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 835,
      stroke: 'rgba(129, 140, 248, 0.3)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(divider)

    const footerTags = new Textbox(getFooterHashtags(aiData, '#CareerUpdate   #NewBeginnings   #LeadershipJourney'), {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 852,
      width: 820,
      fontSize: 16,
      fontWeight: '500',
      fill: '#a5b4fc',
      textAlign: 'left',
      selectable: true,
    })
    canvas.add(footerTags)
    fitTextToWidth(footerTags, 820, 16, 14)

    const brandFooter = new Textbox('Designed with PostCraft', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 884,
      width: 820,
      fontSize: 13,
      fill: '#64748b',
      charSpacing: 60,
      textAlign: 'left',
      selectable: true,
    })
    canvas.add(brandFooter)
  }

  // ── 6. Professional Poster Generator ───────────────────────────────────────
  const generateProfessionalPoster = (canvas, aiData) => {
    canvas.backgroundColor = '#080c16'
    setBgColor('#080c16')

    // Atmosphere
    const glowCircle = new Circle({
      originX: 'left',
      originY: 'top',
      left: 640,
      top: 40,
      radius: 200,
      fill: 'rgba(129, 140, 248, 0.08)',
      stroke: 'rgba(129, 140, 248, 0.2)',
      strokeWidth: 1.5,
      selectable: true,
      isBackground: true,
    })
    canvas.add(glowCircle)

    // Main frame card
    const outerCard = new Rect({
      originX: 'left',
      originY: 'top',
      left: 50,
      top: 50,
      width: 900,
      height: 900,
      rx: 24,
      ry: 24,
      fill: 'rgba(15, 23, 42, 0.65)',
      stroke: 'rgba(255, 255, 255, 0.1)',
      strokeWidth: 2,
      selectable: true,
      isBackground: true,
    })
    canvas.add(outerCard)

    // TOP 15%: Accent Line & Tag
    const topAccent = new Rect({
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 84,
      width: 60,
      height: 5,
      rx: 2.5,
      ry: 2.5,
      fill: '#818cf8',
      selectable: true,
    })
    canvas.add(topAccent)

    const tagText = getCategoryLabel(aiData?.content_type, 'professional')
    const tag = new Textbox(tagText, {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 100,
      width: 820,
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#818cf8',
      charSpacing: 110,
      textAlign: 'left',
      selectable: true,
    })
    canvas.add(tag)

    // MIDDLE 45%: Hero Headline
    const headlineRaw = aiData?.headline?.trim() || 'Transforming Strategic Vision Into Scalable Architecture'
    const headline = new Textbox(headlineRaw, {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 155,
      width: 820,
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#ffffff',
      lineHeight: 1.25,
      textAlign: 'left',
      selectable: true,
    })
    canvas.add(headline)
    fitTextToWidth(headline, 820, 48, 32)
    const headlineBounds = headline.getBoundingRect()
    const headlineBottom = headline.top + (headlineBounds.height || 85)

    // LOWER 30%: Executive Thought Leadership Card
    const rawDesc = aiData?.poster_text?.trim() || 'Explore how distributed engineering teams build high-performance systems and drive impactful business transformation.'
    const descFormatted = formatSupportingText(rawDesc, 140)
    const cardTop = Math.min(headlineBottom + 32, 460)

    const descBox = new Textbox(descFormatted, {
      originX: 'left',
      originY: 'top',
      left: 120,
      top: cardTop + 40,
      width: 760,
      fontSize: 23,
      fill: '#cbd5e1',
      lineHeight: 1.4,
      textAlign: 'left',
      selectable: true,
    })
    fitTextToWidth(descBox, 760, 23, 19, 140)
    const descBounds = descBox.getBoundingRect()
    const cardHeight = Math.max(descBounds.height + 64, 140)

    const descCard = new Rect({
      originX: 'left',
      originY: 'top',
      left: 90,
      top: cardTop,
      width: 820,
      height: cardHeight,
      rx: 18,
      ry: 18,
      fill: 'rgba(2, 6, 23, 0.7)',
      stroke: 'rgba(255, 255, 255, 0.1)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(descCard)

    const cardLabel = new Textbox('EXECUTIVE PERSPECTIVE & INSIGHTS', {
      originX: 'left',
      originY: 'top',
      left: 120,
      top: cardTop + 14,
      width: 760,
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#818cf8',
      charSpacing: 80,
      textAlign: 'left',
      selectable: true,
    })
    canvas.add(cardLabel)

    canvas.add(descBox)
    const cardBottom = cardTop + cardHeight

    // 3 Strategic Focus Pills
    const stratBadges = extractKeywords(aiData, ['Strategic Vision', 'Scale & Growth', 'Engineering Leadership'])
    const chipNextY = addHorizontalChips(canvas, stratBadges, Math.min(cardBottom + 26, 680), 840, {
      height: 46,
      rx: 23,
      fontSize: 17,
      primaryIndex: 0,
      primaryColor: '#c7d2fe',
      primaryBg: 'rgba(129, 140, 248, 0.2)',
      primaryBorder: 'rgba(129, 140, 248, 0.45)',
    })

    // Strategic Pillars Row
    const pillarsText = new Textbox('✦ STRATEGY   ✦ SCALABILITY   ✦ ORGANIZATIONAL EXCELLENCE', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: Math.min(chipNextY + 12, 785),
      width: 820,
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#a5b4fc',
      charSpacing: 80,
      textAlign: 'left',
      selectable: true,
    })
    canvas.add(pillarsText)

    // BOTTOM 10%: Divider, Hashtags & Subtle Branding
    const divider = new Line([90, 835, 910, 835], {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 835,
      stroke: 'rgba(255, 255, 255, 0.15)',
      strokeWidth: 1.5,
      selectable: true,
    })
    canvas.add(divider)

    const footerTags = new Textbox(getFooterHashtags(aiData, '#Leadership   #Innovation   #Strategy'), {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 852,
      width: 820,
      fontSize: 16,
      fontWeight: '500',
      fill: '#94a3b8',
      textAlign: 'left',
      selectable: true,
    })
    canvas.add(footerTags)
    fitTextToWidth(footerTags, 820, 16, 14)

    const brandFooter = new Textbox('Designed with PostCraft', {
      originX: 'left',
      originY: 'top',
      left: 90,
      top: 884,
      width: 820,
      fontSize: 13,
      fill: '#64748b',
      charSpacing: 60,
      textAlign: 'left',
      selectable: true,
    })
    canvas.add(brandFooter)
  }

  // ── Template Definitions ───────────────────────────────────────────────────
  const applyTemplate = useCallback(
    (templateName, explicitCanvas = null, customAiData = null) => {
      const canvas = explicitCanvas || fabricCanvasRef.current
      if (!canvas) return

      const aiData = customAiData || lastAiDataRef.current

      canvas.clear()
      canvas.discardActiveObject()
      setCurrentTemplate(templateName)

      if (templateName === 'internship') {
        generateInternshipPoster(canvas, aiData)
      } else if (templateName === 'achievement') {
        generateAchievementPoster(canvas, aiData)
      } else if (templateName === 'project') {
        generateProjectPoster(canvas, aiData)
      } else if (templateName === 'certificate') {
        generateCertificatePoster(canvas, aiData)
      } else if (templateName === 'job_update') {
        generateJobUpdatePoster(canvas, aiData)
      } else {
        generateProfessionalPoster(canvas, aiData)
      }

      // Final bounding box validation and alignment check
      validatePosterLayout(canvas)
      canvas.renderAll()
      saveHistory()
    },
    [saveHistory]
  )

  // ── Canvas Initialization & Lifecycle ──────────────────────────────────────
  useEffect(() => {
    if (!canvasElRef.current) return

    const canvas = new Canvas(canvasElRef.current, {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: '#09090b',
      selection: true,
      preserveObjectStacking: true,
    })

    fabricCanvasRef.current = canvas

    canvas.on('selection:created', (e) => {
      syncActiveObject(e.selected?.[0] || canvas.getActiveObject())
    })

    canvas.on('selection:updated', (e) => {
      syncActiveObject(e.selected?.[0] || canvas.getActiveObject())
    })

    canvas.on('selection:cleared', () => {
      syncActiveObject(null)
    })

    canvas.on('object:modified', () => {
      syncActiveObject(canvas.getActiveObject())
      saveHistory()
    })

    const incomingNavState = getNavigationState('/create-poster')

    // Scenario 1: User is opening/editing an existing saved poster
    if (incomingNavState && incomingNavState.posterId) {
      const posterId = incomingNavState.posterId
      setEditingPosterId(posterId)

      getPosterApi(posterId)
        .then((res) => {
          if (res.success && res.poster) {
            const parsedData =
              typeof res.poster.poster_data === 'string'
                ? JSON.parse(res.poster.poster_data)
                : res.poster.poster_data

            canvas.loadFromJSON(parsedData).then(() => {
              canvas.renderAll()
              setPosterTitle(res.poster.title)
              setCurrentTemplate(res.poster.template_name || 'custom')
              if (parsedData.background) {
                setBgColor(parsedData.background)
              }
              setNotification(`Opened poster "${res.poster.title}" for editing.`)
              setTimeout(() => setNotification(''), 4000)
              saveHistory()
            })
          }
        })
        .catch((err) => {
          setError(err.response?.data?.message || 'Failed to load the requested poster.')
        })

      clearNavigationState('/create-poster')
    }
    // Scenario 2: User navigated from /create-post with AI generated content
    else if (incomingNavState && (incomingNavState.headline || incomingNavState.poster_text)) {
      setEditingPosterId(null)
      lastAiDataRef.current = incomingNavState
      const chosenTemplate = getTemplateForContentType(incomingNavState.content_type)
      setPosterTitle(incomingNavState.headline?.slice(0, 50) || 'AI Generated Poster')
      applyTemplate(chosenTemplate, canvas, incomingNavState)
      setNotification(`Poster automatically generated using the ${chosenTemplate.toUpperCase()} template.`)
      setTimeout(() => setNotification(''), 4000)
      clearNavigationState('/create-poster')
    }
    // Scenario 3: Standard new poster
    else {
      setEditingPosterId(null)
      applyTemplate('professional', canvas)
    }

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = canvas.getActiveObject()
        if (active) {
          e.preventDefault()
          canvas.remove(active)
          canvas.discardActiveObject()
          canvas.renderAll()
          syncActiveObject(null)
          saveHistory()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      canvas.dispose()
      fabricCanvasRef.current = null
    }
  }, [syncActiveObject, saveHistory, getNavigationState, clearNavigationState, applyTemplate])

  // ── Add Elements Helpers ───────────────────────────────────────────────────
  const handleAddElement = (type) => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    let textObj
    if (type === 'headline') {
      textObj = new Textbox('Add Headline', {
        left: 90,
        top: 200,
        width: 820,
        fontSize: 44,
        fontWeight: 'bold',
        fill: '#ffffff',
        textAlign: 'center',
      })
    } else if (type === 'subheading') {
      textObj = new Textbox('Add Subheading', {
        left: 120,
        top: 300,
        width: 760,
        fontSize: 26,
        fill: '#cbd5e1',
        textAlign: 'center',
      })
    } else if (type === 'body') {
      textObj = new Textbox('Add your body paragraph or key insights here.', {
        left: 120,
        top: 380,
        width: 760,
        fontSize: 22,
        fill: '#94a3b8',
        textAlign: 'left',
      })
    } else if (type === 'quote') {
      textObj = new Textbox('"The best way to predict the future is to create it."', {
        left: 130,
        top: 320,
        width: 740,
        fontSize: 24,
        fontStyle: 'italic',
        fill: '#c4b5fd',
        textAlign: 'center',
      })
    }

    if (textObj) {
      canvas.add(textObj)
      centerObjectX(textObj)
      canvas.setActiveObject(textObj)
      canvas.renderAll()
      syncActiveObject(textObj)
      saveHistory()
    }
  }

  // ── Image / Logo Upload Helper ─────────────────────────────────────────────
  const handleFileUpload = (e, isLogo = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target.result
      try {
        const img = await FabricImage.fromURL(dataUrl)

        const maxDim = isLogo ? 120 : 360
        if (img.width > maxDim || img.height > maxDim) {
          const scale = Math.min(maxDim / img.width, maxDim / img.height)
          img.scale(scale)
        }

        const leftPos = isLogo ? 80 : (CANVAS_SIZE - img.getScaledWidth()) / 2
        const topPos = isLogo ? 80 : (CANVAS_SIZE - img.getScaledHeight()) / 2

        img.set({
          left: Math.max(80, Math.min(leftPos, 920 - img.getScaledWidth())),
          top: Math.max(70, Math.min(topPos, 930 - img.getScaledHeight())),
          cornerColor: '#8b5cf6',
          cornerStrokeColor: '#ffffff',
          borderColor: '#8b5cf6',
          cornerSize: 8,
          transparentCorners: false,
        })

        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.renderAll()
        syncActiveObject(img)
        saveHistory()
      } catch (err) {
        console.error('Error loading uploaded graphic:', err)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── Export Download Handlers ───────────────────────────────────────────────
  const handleDownload = (format = 'png') => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    canvas.discardActiveObject()
    canvas.renderAll()

    const dataUrl = canvas.toDataURL({
      format: format === 'png' ? 'png' : 'jpeg',
      quality: 0.95,
      multiplier: 1, // Exact 1000x1000 output
    })

    const cleanTitle = (posterTitle || 'linkedin-poster')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')

    const link = document.createElement('a')
    link.download = `${cleanTitle}-${Date.now()}.${format}`
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setNotification(`Poster successfully exported as ${format.toUpperCase()}.`)
    setTimeout(() => setNotification(''), 3000)
  }

  // ── Save / Update Draft API Handler ────────────────────────────────────────
  const handleSaveDraft = async () => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    setIsSaving(true)
    setError('')
    setNotification('')

    try {
      const posterData = canvas.toJSON()
      const titleClean = posterTitle.trim() || 'Untitled Poster'

      if (editingPosterId) {
        // Update existing poster
        const res = await updatePosterApi(editingPosterId, {
          title: titleClean,
          template_name: currentTemplate,
          poster_data: posterData,
        })

        if (res.success) {
          setNotification('Poster updated successfully!')
          setTimeout(() => setNotification(''), 4000)
        }
      } else {
        // Create new poster
        const res = await createPosterApi({
          title: titleClean,
          template_name: currentTemplate,
          poster_data: posterData,
        })

        if (res.success && res.poster) {
          setEditingPosterId(res.poster.id)
          setNotification('Draft saved successfully to your cloud account!')
          setTimeout(() => setNotification(''), 4000)
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save poster draft.'
      setError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  // ── Load Saved Poster onto Canvas ──────────────────────────────────────────
  const handleLoadPoster = async (poster) => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !poster.poster_data) return

    try {
      const parsedData =
        typeof poster.poster_data === 'string'
          ? JSON.parse(poster.poster_data)
          : poster.poster_data

      await canvas.loadFromJSON(parsedData)
      canvas.renderAll()
      setPosterTitle(poster.title)
      setCurrentTemplate(poster.template_name || 'custom')
      setEditingPosterId(poster.id)
      if (parsedData.background) {
        setBgColor(parsedData.background)
      }
      syncActiveObject(null)
      saveHistory()

      setNotification(`Loaded "${poster.title}" onto canvas.`)
      setTimeout(() => setNotification(''), 3000)
    } catch (err) {
      setError('Failed to render saved poster data onto the canvas.')
    }
  }

  // ── Object Property Update Handlers ────────────────────────────────────────
  const updateTextProp = (key, value) => {
    const canvas = fabricCanvasRef.current
    const active = canvas?.getActiveObject()
    if (!active) return

    setTextProps((prev) => ({ ...prev, [key]: value }))
    active.set(key, value)
    canvas.renderAll()
    saveHistory()
  }

  const handleDeleteActive = () => {
    const canvas = fabricCanvasRef.current
    const active = canvas?.getActiveObject()
    if (!active) return

    canvas.remove(active)
    canvas.discardActiveObject()
    canvas.renderAll()
    syncActiveObject(null)
    saveHistory()
  }

  const handleCenterObject = (direction) => {
    const canvas = fabricCanvasRef.current
    const active = canvas?.getActiveObject()
    if (!active) return

    if (direction === 'h' || direction === 'both') canvas.centerObjectH(active)
    if (direction === 'v' || direction === 'both') canvas.centerObjectV(active)
    canvas.renderAll()
    saveHistory()
  }

  const handleBgColorChange = (color) => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    setBgColor(color)
    canvas.backgroundColor = color
    canvas.renderAll()
    saveHistory()
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col select-none">
      <Navbar />

      {/* Editor Sub-Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/40 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Back & Title */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => navigateTo('/my-posters')}
            className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>My Posters</span>
          </button>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Editable Title input */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={posterTitle}
              onChange={(e) => setPosterTitle(e.target.value)}
              className="text-sm font-semibold text-zinc-100 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-violet-500 outline-none px-1 py-0.5 max-w-[180px] sm:max-w-[260px]"
              title="Click to rename poster draft"
            />
            {editingPosterId && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                Draft #{editingPosterId}
              </span>
            )}
          </div>
        </div>

        {/* Right: History, Export & Save */}
        <div className="flex items-center space-x-2">
          {/* Undo/Redo */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2m15-7l-6 6m6-6l-6-6" />
            </svg>
          </button>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Download PNG */}
          <button
            type="button"
            onClick={() => handleDownload('png')}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>PNG</span>
          </button>

          {/* Download JPG */}
          <button
            type="button"
            onClick={() => handleDownload('jpg')}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>JPG</span>
          </button>

          {/* Save Draft Button */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="inline-flex items-center space-x-1.5 bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>{editingPosterId ? 'Update Poster' : 'Save Draft'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications and Error Banners */}
      {notification && (
        <div className="bg-emerald-950/70 border-b border-emerald-900/80 px-4 py-2 text-center text-xs text-emerald-300">
          {notification}
        </div>
      )}
      {error && (
        <div className="bg-red-950/70 border-b border-red-900/80 px-4 py-2 text-center text-xs text-red-300">
          {error}
        </div>
      )}

      {/* 3-Column Editor Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* ── Left Sidebar: Tools & Assets ──────────────────────────────────── */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950 p-4 space-y-4 overflow-y-auto">
          {/* Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={`text-xs font-medium py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'templates'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Templates
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('elements')}
              className={`text-xs font-medium py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'elements'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Elements
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('saved')
                loadSavedPostersList()
              }}
              className={`text-xs font-medium py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'saved'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Saved
            </button>
          </div>

          {/* Tab 1: Templates */}
          {activeTab === 'templates' && (
            <div className="space-y-3">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Select Template
              </span>

              <button
                type="button"
                onClick={() => applyTemplate('professional', null, lastAiDataRef.current)}
                className="w-full text-left p-3 rounded-lg border border-zinc-800 hover:border-violet-500/60 bg-zinc-900/60 hover:bg-zinc-900 transition-colors cursor-pointer space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-100 group-hover:text-violet-300">
                    Professional
                  </span>
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Sleek dark theme for executive thought leadership & strategy.
                </p>
              </button>

              <button
                type="button"
                onClick={() => applyTemplate('internship', null, lastAiDataRef.current)}
                className="w-full text-left p-3 rounded-lg border border-zinc-800 hover:border-violet-500/60 bg-zinc-900/60 hover:bg-zinc-900 transition-colors cursor-pointer space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-100 group-hover:text-violet-300">
                    Internship
                  </span>
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Milestone celebration for internships & career steps.
                </p>
              </button>

              <button
                type="button"
                onClick={() => applyTemplate('achievement', null, lastAiDataRef.current)}
                className="w-full text-left p-3 rounded-lg border border-zinc-800 hover:border-violet-500/60 bg-zinc-900/60 hover:bg-zinc-900 transition-colors cursor-pointer space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-100 group-hover:text-violet-300">
                    Achievement
                  </span>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Awards, certificates, and landmark milestones.
                </p>
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('project', null, lastAiDataRef.current)}
                className="w-full text-left p-3 rounded-lg border border-zinc-800 hover:border-violet-500/60 bg-zinc-900/60 hover:bg-zinc-900 transition-colors cursor-pointer space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-100 group-hover:text-cyan-300">
                    Project Spotlight
                  </span>
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Tech showcase with hero title and technology chips.
                </p>
              </button>

              <button
                type="button"
                onClick={() => applyTemplate('certificate', null, lastAiDataRef.current)}
                className="w-full text-left p-3 rounded-lg border border-zinc-800 hover:border-violet-500/60 bg-zinc-900/60 hover:bg-zinc-900 transition-colors cursor-pointer space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-100 group-hover:text-emerald-300">
                    Certificate
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Official credentials and verified skill milestones.
                </p>
              </button>

              <button
                type="button"
                onClick={() => applyTemplate('job_update', null, lastAiDataRef.current)}
                className="w-full text-left p-3 rounded-lg border border-zinc-800 hover:border-violet-500/60 bg-zinc-900/60 hover:bg-zinc-900 transition-colors cursor-pointer space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-100 group-hover:text-indigo-300">
                    Job Update
                  </span>
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Career moves, new chapters, and executive roles.
                </p>
              </button>
            </div>
          )}

          {/* Tab 2: Elements (Typography, Image, Logo) */}
          {activeTab === 'elements' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Typography
                </span>

                <button
                  type="button"
                  onClick={() => handleAddElement('headline')}
                  className="w-full text-left p-2.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-100 font-bold text-sm transition-colors cursor-pointer"
                >
                  + Headline
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('subheading')}
                  className="w-full text-left p-2.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  + Subheading
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('body')}
                  className="w-full text-left p-2.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 text-xs transition-colors cursor-pointer"
                >
                  + Body Text
                </button>

                <button
                  type="button"
                  onClick={() => handleAddElement('quote')}
                  className="w-full text-left p-2.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-violet-300 italic text-xs transition-colors cursor-pointer"
                >
                  + Quote / Punchline
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Graphics & Media
                </span>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, false)}
                  className="hidden"
                />

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, true)}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full p-2.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-200 text-xs font-medium flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Add Photo / Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full p-2.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-200 text-xs font-medium flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <span>Add Company Logo</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Saved Drafts */}
          {activeTab === 'saved' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Saved Drafts
                </span>
                <button
                  type="button"
                  onClick={loadSavedPostersList}
                  disabled={isLoadingSaved}
                  className="text-[10px] text-violet-400 hover:text-violet-300 font-medium cursor-pointer"
                >
                  Refresh
                </button>
              </div>

              {isLoadingSaved ? (
                <p className="text-xs text-zinc-500 text-center py-4">Loading drafts...</p>
              ) : savedPosters.length === 0 ? (
                <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800 text-center space-y-1">
                  <p className="text-xs text-zinc-400">No saved drafts yet</p>
                  <p className="text-[10px] text-zinc-500">
                    Click "Save Draft" in the top bar to store your work.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedPosters.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-200 line-clamp-1">
                          {p.title}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>{new Date(p.created_at).toLocaleDateString()}</span>
                        <button
                          type="button"
                          onClick={() => handleLoadPoster(p)}
                          className="text-violet-400 hover:text-violet-300 font-medium px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 cursor-pointer"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ── Center: Canvas Workspace ───────────────────────────────────────── */}
        <main className="flex-1 bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 overflow-auto">
          <div className="relative p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 shadow-2xl">
            <canvas ref={canvasElRef} width={CANVAS_SIZE} height={CANVAS_SIZE} />
          </div>

          <div className="mt-3 flex items-center space-x-4 text-xs text-zinc-500">
            <span>Aspect Ratio: 1:1 (Square)</span>
            <span>•</span>
            <span>Export: High-Res 1000 × 1000 px</span>
            <span>•</span>
            <span>Editable on Canvas</span>
          </div>
        </main>

        {/* ── Right Sidebar: Object & Background Properties ──────────────────── */}
        <aside className="w-full md:w-64 border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-950 p-4 space-y-5 overflow-y-auto">
          {activeObject ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                  {activeObject.type === 'textbox' || activeObject.type === 'text'
                    ? 'Text Properties'
                    : activeObject.type === 'image'
                    ? 'Image Properties'
                    : 'Object Properties'}
                </span>
                <button
                  type="button"
                  onClick={handleDeleteActive}
                  title="Delete Object (Del)"
                  className="text-xs text-red-400 hover:text-red-300 font-medium px-2 py-0.5 rounded border border-red-900/60 bg-red-950/40 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>

              {(activeObject.type === 'textbox' || activeObject.type === 'text') && (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">Content</label>
                    <textarea
                      rows="2"
                      value={textProps.text}
                      onChange={(e) => updateTextProp('text', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-zinc-900 text-xs text-zinc-100 border border-zinc-800 focus:border-violet-500 outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Font Size</span>
                      <span className="font-mono text-zinc-200">{textProps.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="72"
                      value={textProps.fontSize}
                      onChange={(e) => updateTextProp('fontSize', parseInt(e.target.value, 10))}
                      className="w-full accent-violet-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">Styling</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateTextProp('fontWeight', textProps.fontWeight === 'bold' ? 'normal' : 'bold')
                        }
                        className={`text-xs py-1.5 rounded border transition-colors font-bold cursor-pointer ${
                          textProps.fontWeight === 'bold'
                            ? 'bg-violet-950/80 text-violet-300 border-violet-700'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        Bold
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateTextProp('fontStyle', textProps.fontStyle === 'italic' ? 'normal' : 'italic')
                        }
                        className={`text-xs py-1.5 rounded border transition-colors italic cursor-pointer ${
                          textProps.fontStyle === 'italic'
                            ? 'bg-violet-950/80 text-violet-300 border-violet-700'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        Italic
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">Alignment</label>
                    <div className="grid grid-cols-3 gap-1">
                      {['left', 'center', 'right'].map((align) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => updateTextProp('textAlign', align)}
                          className={`text-xs py-1 rounded border capitalize transition-colors cursor-pointer ${
                            textProps.textAlign === align
                              ? 'bg-violet-950/80 text-violet-300 border-violet-700 font-medium'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-400">Text Color</label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_TEXT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => updateTextProp('fill', color)}
                          style={{ backgroundColor: color }}
                          className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                            textProps.fill === color
                              ? 'ring-2 ring-violet-500 ring-offset-1 ring-offset-zinc-950 scale-110'
                              : 'border-zinc-700 hover:scale-105'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1 pt-2 border-t border-zinc-800">
                <label className="text-[11px] font-medium text-zinc-400">Positioning</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCenterObject('h')}
                    className="text-xs py-1 px-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                  >
                    Center Horiz.
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCenterObject('v')}
                    className="text-xs py-1 px-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                  >
                    Center Vert.
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80 text-center space-y-1">
              <span className="text-xs font-medium text-zinc-300 block">No Element Selected</span>
              <p className="text-[11px] text-zinc-500">
                Click any text or image on the canvas to inspect and edit properties.
              </p>
            </div>
          )}

          <div className="space-y-3 pt-3 border-t border-zinc-800">
            <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider block">
              Canvas Background
            </span>

            <div className="space-y-2">
              <label className="text-[11px] font-medium text-zinc-400">Presets</label>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESET_BG_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handleBgColorChange(c.value)}
                    style={{ backgroundColor: c.value }}
                    className={`h-7 rounded border text-[10px] text-zinc-300 font-medium flex items-center justify-center transition-all cursor-pointer ${
                      bgColor === c.value
                        ? 'border-violet-500 ring-1 ring-violet-500'
                        : 'border-zinc-700/60 hover:border-zinc-500'
                    }`}
                  >
                    {c.label.split(' ')[0]}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => handleBgColorChange(e.target.value)}
                  className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                />
                <span className="text-xs text-zinc-400 font-mono">{bgColor}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
