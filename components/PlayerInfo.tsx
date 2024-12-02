interface PlayerInfoProps {
  faction: string
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({ faction }) => {
  return (
    <div className="mb-4 text-center">
      <h2 className="text-2xl font-bold pixel-text">Your Faction: {faction}</h2>
      <p className="text-sm pixel-text">Place your Brawler Bear on an empty square or challenge a rival!</p>
    </div>
  )
}

export default PlayerInfo

