/**
 * football.ts — Easter egg: click the football and it gets kicked across
 * the floor under real (cannon-es) physics for ~3 seconds, then snaps
 * back. cannon-es is lazy-loaded so it's kept out of the main bundle.
 * Owned by W11.
 */

import type { SceneContext, Room, AudioController } from '../contracts'

export interface FootballDeps {
  sceneCtx: SceneContext
  room: Room
  audio: AudioController
}

/**
 * Kick the football with a cannon-es physics step. Resolves when the ball
 * has snapped back to its resting position (~3s).
 */
export async function onFootballClick(deps: FootballDeps): Promise<void> {
  const ball = deps.room.props.football
  const origPos = ball.position.clone()

  // Lazy-load cannon-es so it doesn't inflate the main chunk.
  const { World, Body, Sphere, Plane, Vec3 } = await import('cannon-es')

  const world = new World()
  world.gravity.set(0, -9.82, 0)

  const ballBody = new Body({ mass: 0.45, shape: new Sphere(0.13) })
  ballBody.position.set(origPos.x, origPos.y + 0.13, origPos.z)
  ballBody.linearDamping = 0.05
  ballBody.angularDamping = 0.1
  world.addBody(ballBody)

  const floorBody = new Body({ mass: 0, shape: new Plane() })
  floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
  world.addBody(floorBody)

  // Initial kick: up + forward (toward +Z).
  ballBody.applyImpulse(new Vec3(-0.6, 2.8, 1.4), new Vec3(0, 0, 0))

  deps.audio.cue('ball-thud')

  let lastThudY = ballBody.position.y
  const unsubscribe = deps.sceneCtx.onTick((dt) => {
    world.step(1 / 60, dt, 3)
    ball.position.set(ballBody.position.x, ballBody.position.y - 0.13, ballBody.position.z)
    ball.quaternion.set(
      ballBody.quaternion.x,
      ballBody.quaternion.y,
      ballBody.quaternion.z,
      ballBody.quaternion.w,
    )
    // crude bounce detection → thud cue
    if (lastThudY > 0.2 && ballBody.position.y < 0.18 && ballBody.velocity.y < -0.5) {
      deps.audio.cue('ball-thud')
    }
    lastThudY = ballBody.position.y
  })

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 3000)
  })

  unsubscribe()
  world.removeBody(ballBody)
  world.removeBody(floorBody)

  ball.position.copy(origPos)
  ball.quaternion.set(0, 0, 0, 1)
}
