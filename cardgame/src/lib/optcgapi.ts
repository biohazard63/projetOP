export async function fetchAllSets() {
  try {
    const API_KEY = "a5efebe9adc836a0d6d3798bf21658b03cda8e322ba5d7e57fa4e2cc12f84179";
    
    const response = await fetch('https://apitcg.com/api/one-piece/sets', {
      headers: {
        'X-Api-Key': API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des sets : ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur dans fetchAllSets:', error);
    return { data: [] };
  }
}

export async function fetchCardsBySet(setId: string) {
  try {
    const API_KEY = "a5efebe9adc836a0d6d3798bf21658b03cda8e322ba5d7e57fa4e2cc12f84179";
    
    const response = await fetch(`https://apitcg.com/api/one-piece/cards?q=set.id:${setId}`, {
      headers: {
        'X-Api-Key': API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des cartes du set : ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur dans fetchCardsBySet:', error);
    return { data: [] };
  }
}

// Exemple d'utilisation :
// const sets = await fetchAllSets();
// console.log(sets);
// const cards = await fetchCardsBySet('OP01');
// console.log(cards); 