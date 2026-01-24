// Simple confetti effect without external dependencies
export default function confetti() {
  const colors = ['#c8ff00', '#00d4ff', '#ff6b6b', '#feca57', '#ff9ff3'];
  const confettiCount = 50;
  
  for (let i = 0; i < confettiCount; i++) {
    createConfettiPiece(colors[Math.floor(Math.random() * colors.length)]);
  }
}

function createConfettiPiece(color: string) {
  const confetti = document.createElement('div');
  
  confetti.style.cssText = `
    position: fixed;
    width: ${Math.random() * 10 + 5}px;
    height: ${Math.random() * 10 + 5}px;
    background: ${color};
    left: ${Math.random() * 100}vw;
    top: -20px;
    z-index: 9999;
    pointer-events: none;
    border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
    transform: rotate(${Math.random() * 360}deg);
  `;
  
  document.body.appendChild(confetti);
  
  const animation = confetti.animate([
    { 
      transform: `translateY(0) rotate(0deg)`,
      opacity: 1 
    },
    { 
      transform: `translateY(100vh) rotate(${Math.random() * 720}deg)`,
      opacity: 0 
    }
  ], {
    duration: Math.random() * 2000 + 2000,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  });
  
  animation.onfinish = () => confetti.remove();
}
