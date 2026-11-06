import { useEffect, useRef } from 'react'

const PARTICLE_COUNT = 36
const COLOR = '255, 153, 0'

interface Particle { x: number; y: number; radius: number; speed: number; drift: number; alpha: number }

const createParticle = (width: number, height: number): Particle => ({
  x: Math.random() * width,
  y: Math.random() * height,
  radius: 1 + Math.random() * 1.5,
  speed: 0.05 + Math.random() * 0.15,
  drift: (Math.random() - 0.5) * 0.1,
  alpha: 0.15 + Math.random() * 0.3,
})

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    let width = 0
    let height = 0
    const resize = () => {
      const scale = window.devicePixelRatio || 1
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * scale
      canvas.height = height * scale
      context.setTransform(scale, 0, 0, scale, 0, 0)
    }
    resize()

    const particles = Array.from({ length: PARTICLE_COUNT }, () => createParticle(width, height))

    const draw = () => {
      context.clearRect(0, 0, width, height)
      for (const particle of particles) {
        context.beginPath()
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        context.fillStyle = `rgba(${COLOR}, ${particle.alpha})`
        context.fill()
      }
    }

    // Reduced motion keeps the still field and never starts the loop.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw()
      return
    }

    let frame = 0
    const tick = () => {
      for (const particle of particles) {
        particle.y -= particle.speed
        particle.x += particle.drift
        if (particle.y < -4) particle.y = height + 4
        if (particle.x < -4) particle.x = width + 4
        if (particle.x > width + 4) particle.x = -4
      }
      draw()
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="particle-field" aria-hidden="true" />
}
