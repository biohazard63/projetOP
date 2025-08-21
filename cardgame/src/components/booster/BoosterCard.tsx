import { motion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Card } from '@prisma/client';
import Image from 'next/image';
import clsx from 'clsx';

type DragEventType = MouseEvent | TouchEvent | PointerEvent

interface BoosterCardProps {
  card: Card & {
    uniqueId: string;
    isParallel?: boolean;
    isAltArt?: boolean;
    isSpecial?: boolean;
  };
  imageError: boolean;
  isDragging: boolean;
  dragDirection: 'left' | 'right' | null;
  isNewCard: boolean;
  handleDragStart: (event: DragEventType, info: PanInfo) => void;
  handleDrag: (event: DragEventType, info: PanInfo) => void;
  handleDragEnd: (event: DragEventType, info: PanInfo) => void;
  getRarityGlow: (rarity: string) => string;
  index: number;
  isNew?: boolean;
  onDragEnd?: () => void;
}

export default function BoosterCard({
  card,
  imageError,
  isDragging,
  dragDirection,
  isNewCard,
  handleDragStart,
  handleDrag,
  handleDragEnd,
  getRarityGlow,
  index,
  isNew = false,
  onDragEnd,
}: Readonly<BoosterCardProps>) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      className={clsx(
        'relative aspect-[1/1.4] w-full max-w-[280px] rounded-lg',
        'transform cursor-grab transition-all duration-300',
        getRarityGlow(card.rarity),
        isDragging && 'cursor-grabbing scale-105',
        dragDirection === 'left' && '-rotate-12',
        dragDirection === 'right' && 'rotate-12'
      )}
    >
      {/* Image de la carte */}
      <div className="relative h-full w-full overflow-hidden rounded-lg">
        <Image
          src={card.imageUrl || '/images/card-back.png'}
          alt={card.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 60vw, (max-width: 1024px) 40vw, 280px"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = '/images/card-back.png';
          }}
        />
      </div>

      {/* Indicateur de nouvelle carte */}
      {isNew && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-2 top-2 flex h-8 items-center gap-1 rounded-full bg-emerald-500/50 px-3 text-sm font-medium text-emerald-50 backdrop-blur-sm"
        >
          NEW
        </motion.div>
      )}

      {/* Indicateur de direction */}
      {dragDirection && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          className={clsx(
            'absolute bottom-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm',
            dragDirection === 'left' ? 'left-4' : 'right-4'
          )}
        >
          <ArrowRight
            className={clsx(
              'h-6 w-6 text-white',
              dragDirection === 'left' && 'rotate-180'
            )}
          />
        </motion.div>
      )}
    </motion.div>
  );
} 