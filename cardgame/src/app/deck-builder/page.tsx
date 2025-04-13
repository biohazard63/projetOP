'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Types temporaires en attendant l'intégration avec Prisma
type Card = {
  id: string
  name: string
  type: string
  color: string
  cost: number
  power?: number
  counter?: number
  imageUrl: string
}

export default function DeckBuilder() {
  const [deck, setDeck] = useState<Card[]>([])
  const [cardLibrary, setCardLibrary] = useState<Card[]>([
    // Exemple de cartes (à remplacer par les vraies données)
    {
      id: '1',
      name: 'Monkey D. Luffy',
      type: 'Leader',
      color: 'Red',
      cost: 5,
      power: 6000,
      imageUrl: '/cards/luffy.jpg'
    },
    // Ajoutez plus de cartes ici
  ])

  const onDragEnd = (result: any) => {
    if (!result.destination) return

    const { source, destination } = result

    if (source.droppableId === 'library' && destination.droppableId === 'deck') {
      const card = cardLibrary[source.index]
      setDeck([...deck, card])
    } else if (source.droppableId === 'deck' && destination.droppableId === 'library') {
      const [removed] = deck.splice(source.index, 1)
      setDeck(deck.filter((_, index) => index !== source.index))
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Créateur de Deck</h1>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Bibliothèque de Cartes</CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="library">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="grid grid-cols-2 sm:grid-cols-3 gap-4"
                    >
                      {cardLibrary.map((card, index) => (
                        <Draggable
                          key={card.id}
                          draggableId={card.id}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="card-preview"
                            >
                              <img
                                src={card.imageUrl}
                                alt={card.name}
                                className="w-full h-auto rounded-lg shadow-md"
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Votre Deck ({deck.length} cartes)</CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="deck">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="min-h-[400px] border-2 border-dashed border-gray-300 rounded-lg p-4"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {deck.map((card, index) => (
                          <Draggable
                            key={card.id}
                            draggableId={card.id}
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="card-preview"
                              >
                                <img
                                  src={card.imageUrl}
                                  alt={card.name}
                                  className="w-full h-auto rounded-lg shadow-md"
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>
        </div>
      </DragDropContext>
    </div>
  )
} 