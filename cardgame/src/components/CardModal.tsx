import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect } from 'react';
import Image from 'next/image';
import { X, Plus } from 'lucide-react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';

export interface Card {
  id: string;
  name: string;
  type: string;
  color: string;
  cost: number;
  power?: number;
  counter?: number;
  effect?: string;
  rarity: string;
  imageUrl: string;
  set?: string;
  attribute?: string;
  attributeImage?: string;
  family?: string;
  ability?: string;
  trigger?: string;
  notes?: string;
  code?: string;
  quantity?: number;
}

interface CardModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToDeck?: (card: Card) => void;
}

export default function CardModal({ card, isOpen, onClose, onAddToDeck }: CardModalProps) {
  if (!card) return null;

  const controls = useAnimation();
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);

  // Réinitialiser l'animation quand la modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      controls.set({ x: 0, opacity: 1 });
      x.set(0);
    }
  }, [isOpen, controls, x]);

  const handleDragEnd = async (event: any, info: any) => {
    const offset = info.offset.x;
    if (Math.abs(offset) > 100) {
      await controls.start({ x: offset > 0 ? 500 : -500, opacity: 0 });
      onClose();
    } else {
      controls.start({ x: 0, opacity: 1 });
    }
  };

  // Fonction pour formater le nom du set
  const formatSetName = (setName: string | undefined) => {
    if (!setName) return '';
    
    // Supprimer les tirets au début et à la fin
    let formatted = setName.replace(/^-+|-+$/g, '');
    
    // Remplacer les tirets par des espaces
    formatted = formatted.replace(/-/g, ' ');
    
    // Mettre en majuscules les lettres après les crochets
    formatted = formatted.replace(/\[(.*?)\]/g, (match, p1) => {
      return `[${p1.toUpperCase()}]`;
    });
    
    return formatted;
  };

  // Fonction pour obtenir la couleur de la rareté
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Légendaire':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Rare':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Super Rare':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Secret Rare':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gray-900/95 backdrop-blur-md border border-gray-700 shadow-2xl transition-all">
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.1}
                  onDragEnd={handleDragEnd}
                  animate={controls}
                  style={{ x, opacity }}
                  className="relative"
                >
                  <div className="absolute -top-2 -right-2 z-10">
                    <button
                      onClick={onClose}
                      className="rounded-full p-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all hover:scale-110 active:scale-95"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <div className="flex flex-col md:flex-row gap-8 p-6">
                    <div className="relative w-full md:w-1/2 aspect-[3/4]">
                      <Image
                        src={card.imageUrl}
                        alt={card.name}
                        fill
                        className="object-contain rounded-lg"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority
                      />
                      {onAddToDeck && (
                        <button
                          onClick={() => onAddToDeck(card)}
                          className="absolute bottom-4 right-4 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 hover:from-red-700 hover:via-red-600 hover:to-orange-600 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                        >
                          <Plus className="h-6 w-6" />
                        </button>
                      )}
                    </div>
                    <div className="w-full md:w-1/2 space-y-6">
                      <div>
                        <Dialog.Title className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500">
                          {card.name}
                        </Dialog.Title>
                        {card.set && (
                          <div className="mt-2 flex items-center">
                            <span className="text-sm font-medium text-gray-400 mr-2">Set:</span>
                            <span className="text-sm font-medium text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                              {formatSetName(card.set)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-sm text-gray-400">Type</span>
                          <p className="font-medium text-white">{card.type}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm text-gray-400">Couleur</span>
                          <p className="font-medium text-white">{card.color}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm text-gray-400">Coût</span>
                          <p className="font-medium text-white">{card.cost} ⭐</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm text-gray-400">Rareté</span>
                          <p className={`font-medium px-3 py-1 rounded-full border ${getRarityColor(card.rarity)}`}>
                            {card.rarity}
                          </p>
                        </div>
                        {card.power !== undefined && (
                          <div className="space-y-1">
                            <span className="text-sm text-gray-400">Puissance</span>
                            <p className="font-medium text-white">{card.power}</p>
                          </div>
                        )}
                        {card.counter !== undefined && (
                          <div className="space-y-1">
                            <span className="text-sm text-gray-400">Counter</span>
                            <p className="font-medium text-white">{card.counter}</p>
                          </div>
                        )}
                        {card.attribute && (
                          <div className="space-y-1 col-span-2">
                            <span className="text-sm text-gray-400">Attribut</span>
                            <div className="flex items-center gap-2">
                              {card.attributeImage && (
                                <Image
                                  src={card.attributeImage}
                                  alt={card.attribute}
                                  width={24}
                                  height={24}
                                  className="rounded-full"
                                />
                              )}
                              <p className="font-medium text-white">{card.attribute}</p>
                            </div>
                          </div>
                        )}
                        {card.family && (
                          <div className="space-y-1 col-span-2">
                            <span className="text-sm text-gray-400">Famille</span>
                            <p className="font-medium text-white">{card.family}</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        {card.ability && (
                          <div className="space-y-1">
                            <span className="text-sm text-gray-400">Capacité</span>
                            <p className="text-white bg-gray-800/50 p-3 rounded-lg border border-gray-700">{card.ability}</p>
                          </div>
                        )}
                        {card.trigger && (
                          <div className="space-y-1">
                            <span className="text-sm text-gray-400">Trigger</span>
                            <p className="text-white bg-gray-800/50 p-3 rounded-lg border border-gray-700">{card.trigger}</p>
                          </div>
                        )}
                        {card.notes && (
                          <div className="space-y-1">
                            <span className="text-sm text-gray-400">Notes</span>
                            <p className="text-white bg-gray-800/50 p-3 rounded-lg border border-gray-700">{card.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 