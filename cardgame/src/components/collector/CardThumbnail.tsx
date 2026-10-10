'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
export default function CardThumbnail({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return <Image src={!failed && src ? src : '/images/card-back.jpg'} alt={name} width={38} height={53} onError={()=>setFailed(true)} />
}
