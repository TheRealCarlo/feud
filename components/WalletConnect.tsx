interface WalletConnectProps {
  onConnect: (faction: string) => void
}

const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect }) => {
  const handleConnect = () => {
    // Simulate wallet connection and faction assignment
    const factions = ['Red', 'Blue', 'Green']
    const randomFaction = factions[Math.floor(Math.random() * factions.length)]
    onConnect(randomFaction)
  }

  return (
    <button
      onClick={handleConnect}
      className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors duration-200 pixel-button"
    >
      Connect Wallet to Play
    </button>
  )
}

export default WalletConnect

