'use client'
import { isRemoteImage } from './remote'

// next/image loader: official artwork is relayed by /card-image (its host forbids cross-site display, and the Vercel image
// optimizer has a monthly quota); local files are served as they are. One URL per image whatever the width, so the CDN
// fetches each artwork once; the width only goes in the fragment, which is never sent.
export default function cardImageLoader({ src, width }: { src: string; width: number }) {
  return isRemoteImage(src) ? `/card-image?u=${encodeURIComponent(src)}#w=${width}` : src
}
