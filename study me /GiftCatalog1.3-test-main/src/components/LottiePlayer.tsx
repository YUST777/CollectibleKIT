'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

interface LottiePlayerProps {
  animationData: any
  style?: React.CSSProperties
  loop?: boolean
  autoplay?: boolean
  rendererSettings?: any
}

export function LottiePlayer({ animationData, style, loop = true, autoplay = true, rendererSettings }: LottiePlayerProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return <div style={style} />
  }

  return (
    <Lottie
      animationData={animationData}
      style={style}
      loop={loop}
      autoplay={autoplay}
      rendererSettings={rendererSettings}
    />
  )
} 