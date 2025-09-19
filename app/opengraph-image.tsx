import { ImageResponse } from 'next/og'

export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function Image() {
  const title = 'ThesisFlow-AI'
  const subtitle = 'AI Research Platform'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: 'linear-gradient(135deg, #0b1220 0%, #1b2a4a 50%, #0b1220 100%)',
          color: '#fff',
          fontFamily: 'Inter, ui-sans-serif, system-ui',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            opacity: 0.9,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              background: '#FF6B2C',
              borderRadius: 8,
            }}
          />
          <div style={{ fontSize: 28, letterSpacing: -0.5, fontWeight: 600 }}>ThesisFlow-AI</div>
        </div>

        <div style={{ height: 28 }} />

        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -1 }}>{title}</div>
        <div style={{ fontSize: 36, opacity: 0.9, marginTop: 8 }}>{subtitle}</div>

        <div style={{ marginTop: 36, display: 'flex', gap: 18, opacity: 0.88 }}>
          <Pill>Explorer</Pill>
          <Pill>Smart Summarizer</Pill>
          <Pill>Planner</Pill>
          <Pill>AI Assistant</Pill>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}

function Pill({ children }: { children: string }) {
  return (
    <div
      style={{
        padding: '10px 16px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.08)',
        fontSize: 24,
      }}
    >
      {children}
    </div>
  )
}
