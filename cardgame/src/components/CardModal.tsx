import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import Image from 'next/image';

interface Card {
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
}

interface CardModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CardModal({ card, isOpen, onClose }: CardModalProps) {
  if (!card) return null;

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
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="relative w-full md:w-1/2 aspect-[3/4]">
                    <Image
                      src={card.imageUrl}
                      alt={card.name}
                      fill
                      className="object-contain rounded-lg"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority
                    />
                  </div>
                  <div className="w-full md:w-1/2 space-y-6">
                    <div>
                      <Dialog.Title className="text-3xl font-bold text-gray-900">
                        {card.name}
                      </Dialog.Title>
                      {card.set && (
                        <div className="mt-2 flex items-center">
                          <span className="text-sm font-medium text-gray-500 mr-2">Set:</span>
                          <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {formatSetName(card.set)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-sm text-gray-500">Type</span>
                        <p className="font-medium text-gray-900">{card.type}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-gray-500">Couleur</span>
                        <p className="font-medium text-gray-900">{card.color}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-gray-500">Coût</span>
                        <p className="font-medium text-gray-900">{card.cost} mana</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-gray-500">Rareté</span>
                        <p className={`font-medium px-2 py-1 rounded inline-block ${
                          card.rarity === 'Légendaire'
                            ? 'bg-yellow-100 text-yellow-800'
                            : card.rarity === 'Rare'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {card.rarity}
                        </p>
                      </div>
                      {card.power !== undefined && (
                        <div className="space-y-1">
                          <span className="text-sm text-gray-500">Puissance</span>
                          <p className="font-medium text-gray-900">{card.power}</p>
                        </div>
                      )}
                      {card.counter !== undefined && (
                        <div className="space-y-1">
                          <span className="text-sm text-gray-500">Counter</span>
                          <p className="font-medium text-gray-900">{card.counter}</p>
                        </div>
                      )}
                      {card.attribute && (
                        <div className="space-y-1 col-span-2">
                          <span className="text-sm text-gray-500">Attribut</span>
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
                            <p className="font-medium text-gray-900">{card.attribute}</p>
                          </div>
                        </div>
                      )}
                      {card.family && (
                        <div className="space-y-1 col-span-2">
                          <span className="text-sm text-gray-500">Famille</span>
                          <p className="font-medium text-gray-900">{card.family}</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      {card.ability && (
                        <div className="space-y-1">
                          <span className="text-sm text-gray-500">Capacité</span>
                          <p className="text-gray-900">{card.ability}</p>
                        </div>
                      )}
                      {card.trigger && (
                        <div className="space-y-1">
                          <span className="text-sm text-gray-500">Trigger</span>
                          <p className="text-gray-900">{card.trigger}</p>
                        </div>
                      )}
                      {card.notes && (
                        <div className="space-y-1">
                          <span className="text-sm text-gray-500">Notes</span>
                          <p className="text-gray-900">{card.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 