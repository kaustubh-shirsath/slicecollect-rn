// Take Photo / Upload control. Prototype only: picked files live in memory on
// this device as blob/data URIs and are never sent to or stored on a backend.
//
// Web/PWA: Upload opens the browser file chooser. Take Photo opens the phone
// camera on touch devices (capture input) and an in-app webcam viewfinder on
// laptops. Native: expo-image-picker camera / gallery.
import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, Image, Modal, Platform, Alert } from 'react-native'
import type { MediaType } from 'expo-image-picker'

export type Attachment = {
  uri: string
  name: string
  mime: string
  source: 'camera' | 'upload'
  size?: number
}

type Props = {
  label: string
  hint?: string
  value: Attachment | null
  onChange: (a: Attachment | null) => void
  required?: boolean
  error?: boolean
  /** Upload also accepts PDFs (web only — native picker is images only) */
  allowPdf?: boolean
}

const ACCENT = '#D30AD7'

function fmtSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`
}

// ── Web helpers ────────────────────────────────────────────────────────────

function pickFileWeb(accept: string, capture = false): Promise<Attachment | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    if (capture) input.setAttribute('capture', 'environment')
    input.style.display = 'none'
    const done = (a: Attachment | null) => { resolve(a); input.remove() }
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      done(file ? {
        uri: URL.createObjectURL(file),
        name: file.name || `photo_${Date.now()}.jpg`,
        mime: file.type || 'image/jpeg',
        size: file.size,
        source: capture ? 'camera' : 'upload',
      } : null)
    })
    input.addEventListener('cancel', () => done(null))
    document.body.appendChild(input)
    input.click()
  })
}

function isTouchDevice() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches
}

function hasWebcamApi() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

// ── Native helper ──────────────────────────────────────────────────────────

async function pickNative(kind: 'camera' | 'upload'): Promise<Attachment | null> {
  // Lazy so a dev client built before this module was added only fails on tap, not on screen load
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ImagePicker = require('expo-image-picker') as typeof import('expo-image-picker')
  if (kind === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Camera permission needed', 'Allow camera access in phone Settings to take a photo.')
      return null
    }
  }
  const opts = { mediaTypes: ['images'] as MediaType[], quality: 0.7 }
  const res = kind === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts)
  if (res.canceled || !res.assets?.length) return null
  const a = res.assets[0]
  return {
    uri: a.uri,
    name: a.fileName ?? `photo_${Date.now()}.jpg`,
    mime: a.mimeType ?? 'image/jpeg',
    size: a.fileSize,
    source: kind,
  }
}

// ── Webcam viewfinder (web, non-touch) ─────────────────────────────────────

function WebCameraModal({ onCancel, onUse, onUploadInstead }: {
  onCancel: () => void
  onUse: (a: Attachment) => void
  onUploadInstead: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [canFlip, setCanFlip] = useState(false)
  const [shot, setShot] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function attachStream() {
    const v = videoRef.current
    if (v && streamRef.current && v.srcObject !== streamRef.current) {
      v.srcObject = streamRef.current
      v.play().catch(() => {})
    }
  }

  useEffect(() => {
    if (shot) return
    let cancelled = false
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        attachStream()
        return navigator.mediaDevices.enumerateDevices()
          .then(ds => setCanFlip(ds.filter(d => d.kind === 'videoinput').length > 1))
      })
      .catch((e: any) => setError(e?.name === 'NotAllowedError'
        ? 'Camera access is blocked. Allow camera for this site in browser settings, or upload a photo instead.'
        : 'No camera found on this device. Upload a photo instead.'))
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [facing, shot])

  function capture() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Front camera preview is mirrored — save what the agent saw
    if (facing === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1) }
    ctx.drawImage(v, 0, 0)
    setShot(canvas.toDataURL('image/jpeg', 0.85))
  }

  return (
    <Modal visible animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}>
          <TouchableOpacity onPress={onCancel}><Text style={{ color: '#fff', fontSize: 15 }}>Cancel</Text></TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{shot ? 'Use this photo?' : 'Take Photo'}</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {error ? (
            <View style={{ padding: 24, alignItems: 'center', gap: 16, maxWidth: 360 }}>
              <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>{error}</Text>
              <TouchableOpacity onPress={onUploadInstead} style={{ backgroundColor: ACCENT, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 24 }}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Upload instead</Text>
              </TouchableOpacity>
            </View>
          ) : shot ? (
            <Image source={{ uri: shot }} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
          ) : (
            <video
              ref={el => { videoRef.current = el; attachStream() }}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'contain', transform: facing === 'user' ? 'scaleX(-1)' : undefined }}
            />
          )}
        </View>

        {!error && (
          <View style={{ height: 120, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 24 }}>
            {shot ? (
              <>
                <TouchableOpacity onPress={() => setShot(null)} style={{ paddingVertical: 12, paddingHorizontal: 24 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onUse({ uri: shot, name: `photo_${Date.now()}.jpg`, mime: 'image/jpeg', size: Math.round(shot.length * 0.75), source: 'camera' })}
                  style={{ backgroundColor: ACCENT, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 28 }}
                >
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Use Photo</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ width: 56 }} />
                <TouchableOpacity
                  onPress={capture}
                  accessibilityLabel="Capture photo"
                  style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}
                >
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' }} />
                </TouchableOpacity>
                {canFlip ? (
                  <TouchableOpacity onPress={() => setFacing(f => (f === 'user' ? 'environment' : 'user'))} style={{ width: 56, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 13 }}>Flip</Text>
                  </TouchableOpacity>
                ) : <View style={{ width: 56 }} />}
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  )
}

// ── Picker card ────────────────────────────────────────────────────────────

export default function AttachmentPicker({ label, hint, value, onChange, required, error, allowPdf }: Props) {
  const [cameraOpen, setCameraOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const isPdf = value?.mime === 'application/pdf'

  function replace(a: Attachment | null) {
    if (value?.uri.startsWith('blob:')) URL.revokeObjectURL(value.uri)
    onChange(a)
  }

  async function upload() {
    const a = Platform.OS === 'web'
      ? await pickFileWeb(allowPdf ? 'image/*,application/pdf' : 'image/*')
      : await pickNative('upload')
    if (a) replace(a)
  }

  async function takePhoto() {
    if (Platform.OS !== 'web') {
      const a = await pickNative('camera')
      if (a) replace(a)
    } else if (!isTouchDevice() && hasWebcamApi()) {
      setCameraOpen(true)
    } else {
      const a = await pickFileWeb('image/*', true)
      if (a) replace(a)
    }
  }

  function openPreview() {
    if (!value) return
    if (isPdf) {
      if (Platform.OS === 'web') window.open(value.uri, '_blank')
      return
    }
    setPreviewOpen(true)
  }

  const btn = {
    flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6,
    borderWidth: 1.5, borderColor: ACCENT, borderRadius: 14, paddingVertical: 11,
    backgroundColor: 'rgba(211,10,215,0.06)',
  }

  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 12, elevation: 1,
      borderWidth: error ? 1.5 : 0, borderColor: error ? '#CE1D26' : 'transparent',
    }}>
      <View>
        <Text style={{ fontSize: 13, fontWeight: '600', color: error ? '#991B1B' : 'rgba(0,0,0,0.85)' }}>
          {label}{required ? ' *' : ''}
        </Text>
        {!!hint && <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>{hint}</Text>}
      </View>

      {value && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F0FDF4', borderRadius: 14, padding: 8 }}>
          <TouchableOpacity onPress={openPreview} accessibilityLabel="View attachment">
            {isPdf ? (
              <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#CE1D26' }}>PDF</Text>
              </View>
            ) : (
              <Image source={{ uri: value.uri }} style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: '#E5E7EB' }} />
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#166534' }}>
              ✓ {value.source === 'camera' ? 'Photo taken' : 'File uploaded'}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>
              {value.name}{value.size ? ` · ${fmtSize(value.size)}` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={() => replace(null)} hitSlop={8} style={{ paddingHorizontal: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#CE1D26' }}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity onPress={takePhoto} style={btn}>
          <Text style={{ fontSize: 15 }}>📷</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: ACCENT }}>{value ? 'Retake' : 'Take Photo'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={upload} style={btn}>
          <Text style={{ fontSize: 15 }}>📁</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: ACCENT }}>{value ? 'Replace' : 'Upload'}</Text>
        </TouchableOpacity>
      </View>

      {cameraOpen && (
        <WebCameraModal
          onCancel={() => setCameraOpen(false)}
          onUse={a => { setCameraOpen(false); replace(a) }}
          onUploadInstead={() => { setCameraOpen(false); upload() }}
        />
      )}

      {previewOpen && value && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => setPreviewOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', padding: 16 }}>
            <Image source={{ uri: value.uri }} resizeMode="contain" style={{ width: '100%', height: '80%' }} />
            <Text style={{ color: '#fff', textAlign: 'center', marginTop: 12, fontSize: 13 }}>Tap anywhere to close</Text>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  )
}
