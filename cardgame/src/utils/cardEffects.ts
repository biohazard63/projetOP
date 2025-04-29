export const getRarityGlow = (rarity: string): string => {
  switch (rarity) {
    case 'L':
      return 'shadow-[0_0_15px_rgba(255,215,0,0.7)] hover:shadow-[0_0_25px_rgba(255,215,0,0.9)]';
    case 'SR':
      return 'shadow-[0_0_15px_rgba(255,140,0,0.7)] hover:shadow-[0_0_25px_rgba(255,140,0,0.9)]';
    case 'R':
      return 'shadow-[0_0_15px_rgba(0,191,255,0.7)] hover:shadow-[0_0_25px_rgba(0,191,255,0.9)]';
    case 'UC':
      return 'shadow-[0_0_15px_rgba(192,192,192,0.5)] hover:shadow-[0_0_25px_rgba(192,192,192,0.7)]';
    case 'C':
      return 'shadow-[0_0_10px_rgba(128,128,128,0.3)] hover:shadow-[0_0_20px_rgba(128,128,128,0.5)]';
    case 'SEC':
      return 'shadow-[0_0_15px_rgba(255,0,255,0.7)] hover:shadow-[0_0_25px_rgba(255,0,255,0.9)]';
    default:
      return 'shadow-lg hover:shadow-xl';
  }
};

export const getRarityColor = (rarity: string): string => {
  switch (rarity) {
    case 'L':
      return 'text-yellow-400';
    case 'SR':
      return 'text-orange-400';
    case 'R':
      return 'text-blue-400';
    case 'UC':
      return 'text-gray-400';
    case 'C':
      return 'text-gray-600';
    case 'SEC':
      return 'text-pink-400';
    default:
      return 'text-gray-700';
  }
}; 