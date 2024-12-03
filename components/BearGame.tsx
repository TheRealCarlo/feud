import { useBears } from '../hooks/useBears'

export function BearGame() {
    const { bears, isLoading, error, placeBear } = useBears()

    const handleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        
        try {
            await placeBear(x, y)
        } catch (err) {
            console.error('Failed to place bear:', err)
        }
    }

    if (isLoading) return <div>Loading bears...</div>
    if (error) return <div>Error: {error}</div>

    return (
        <div 
            className="game-board"
            onClick={handleClick}
            style={{ 
                position: 'relative', 
                width: '100%', 
                height: '500px',
                border: '1px solid #ccc'
            }}
        >
            {bears.map((bear) => (
                <div
                    key={bear.id}
                    className="bear"
                    style={{
                        position: 'absolute',
                        left: `${bear.x}px`,
                        top: `${bear.y}px`,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    🐻
                </div>
            ))}
        </div>
    )
} 